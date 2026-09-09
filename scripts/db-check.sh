#!/usr/bin/env bash
# Validates supabase/migrations/*.sql and supabase/seed.sql against a plain
# Postgres database using scripts/pg-shim.sql for the auth schema.
#
# Usage: DATABASE_URL=postgres://user:pass@localhost:5432/postgres npm run db:check
# The target database is dropped and recreated. Never point this at Supabase.

set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to a throwaway local Postgres}"
DB_NAME="${DB_CHECK_NAME:-teraweights_check}"
ADMIN_URL="$DATABASE_URL"
CHECK_URL="${DATABASE_URL%/*}/$DB_NAME"

psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB_NAME;" -c "create database $DB_NAME;"

psql "$CHECK_URL" -v ON_ERROR_STOP=1 -q -f scripts/pg-shim.sql
for f in supabase/migrations/*.sql; do
  echo "migrate: $f"
  psql "$CHECK_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "seed: supabase/seed.sql"
psql "$CHECK_URL" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql

echo "assert: seed matches brief section 11"
psql "$CHECK_URL" -v ON_ERROR_STOP=1 -q -f scripts/db-assert.sql
echo "db:check OK"
