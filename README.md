# Teraweights

Member PWA and admin portal for Teraweights. Spec: `docs/teraweights-build-brief.md`. Conventions: `CLAUDE.md`. Decisions: `docs/DECISIONS.md`.

## Stack

Next.js 15 (App Router, TypeScript strict, Tailwind v4) · Supabase (Postgres, Auth email OTP, RLS, Storage) · Vercel.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL, anon key, service role key
```

### Database

With the Supabase CLI linked to the project:

```bash
npm run db:push     # apply supabase/migrations
npm run db:reset    # local stack: reset, migrate and reseed (supabase/seed.sql)
```

Without a Supabase project, validate the SQL against a throwaway local Postgres:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run db:check
```

### Run

```bash
npm run dev         # http://localhost:3000
npm run typecheck
npm run lint
npm test
```

## Demo accounts (seeded)

Sign in at `/login` with the email; the 6-digit code arrives by email (locally, in Inbucket at http://127.0.0.1:54324).

| Who | Email | Role |
|---|---|---|
| Aisyah Rahman (demo member) | aisyah@teraweights.test | member |
| Marcus Tan (PRO) | marcus@teraweights.test | member |
| Priya Nair (no active package) | priya@teraweights.test | member |
| Faizal Hamid (coach) | faizal@teraweights.test | coach |
| Admin | admin@stackform.test | admin |

## Routes

- `/login` — email OTP
- `/app/*` — member app (mobile-first, bottom tabs)
- `/admin/*` — admin portal (coach or admin, sidebar)
