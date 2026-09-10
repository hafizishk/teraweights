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

Migrations apply in order: `0001` through `0006` in `supabase/migrations`, then `seed.sql`.

With the Supabase CLI linked to the project:

```bash
npm run db:push     # apply supabase/migrations
npm run db:reset    # local stack: reset, migrate and reseed (supabase/seed.sql)
```

Pasting SQL into the Supabase editor from Windows PowerShell 5.1 requires an explicit encoding, or `Get-Content` reads the file in the system codepage and mangles every non-ASCII character:

```powershell
Get-Content supabase\seed.sql -Raw -Encoding UTF8 | Set-Clipboard
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

Sign in at `/login` with the email. The 6-digit code arrives by email, or locally in Inbucket at http://127.0.0.1:54324.

Demo accounts use plus-aliases of one real inbox, so every sign-in code lands in the same place. Gmail delivers `name+tag@gmail.com` to `name@gmail.com`. To point them elsewhere, see the header comment in `supabase/seed.sql`.

| Who | Email | Role |
|---|---|---|
| Aisyah Rahman (demo member) | hafizishk+aisyah@gmail.com | member |
| Marcus Tan (PRO) | hafizishk+marcus@gmail.com | member |
| Priya Nair (no active package) | hafizishk+priya@gmail.com | member |
| Faizal Hamid (coach) | hafizishk+faizal@gmail.com | coach |
| Admin | hafizishk+admin@gmail.com | admin |

## Routes

- `/login` — email OTP
- `/app/*` — member app (mobile-first, bottom tabs)
- `/admin/*` — admin portal (coach or admin, sidebar)
