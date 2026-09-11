# CLAUDE.md — Teraweights App

Read `docs/teraweights-build-brief.md` before doing anything. It is the spec. Sections referenced below are from that file.

## What this is
Member PWA + admin portal for Teraweights, a Singapore outdoor fitness community. One week to a demoable test build. Working software over polish, but it must look like a real product in the demo.

## Stack (do not deviate)
- Next.js 15 App Router, TypeScript strict, Tailwind
- Supabase: Postgres, Auth (email OTP), RLS on every table, Storage for images
- `@supabase/ssr` for server/client helpers. Server actions for all writes.
- PWA: manifest + service worker. Mobile-first member app at `/app/*`, desktop admin at `/admin/*`.
- Deploy: Vercel.

## Structure
```
app/
  (auth)/login
  app/            # member: home, book, events, parox, profile
  admin/          # admin + coach
  api/            # only where server actions can't work (CSV import, QR validate)
components/
  ui/             # shared primitives
  member/
  admin/
lib/
  supabase/       # server.ts, client.ts, admin.ts (service role, server only)
  actions/        # bookings.ts, events.ts, members.ts, results.ts, announcements.ts
  rules/          # credits.ts, waitlist.ts, checkin.ts — pure functions, unit-testable
supabase/
  migrations/
  seed.sql
docs/
  teraweights-build-brief.md
```

## Roles
`member` | `coach` | `event_assistant` | `admin` on `profiles.role`. Middleware gates `/app` (any authenticated) and `/admin` (any staff role). RLS is the real guard — never rely on middleware alone. Service role key only in `lib/supabase/admin.ts`, only used server-side for guest event registration, CSV import, and QR check-in (reads the session secret and marks attendance after `lib/rules/checkin.ts` validates; members can never read secrets themselves).

## Business rules live in `lib/rules/`
Credits, waitlist promotion, cancellation cutoffs, check-in validation, streak calc, trial eligibility — pure functions with no Supabase calls, called from server actions. See brief section 7. If you change a rule, change it there and nowhere else.

## Scope changes since the brief
Agreed with Stackform on 10 Sep 2026. Details and reasoning in `docs/DECISIONS.md`.
- **Free trial week.** A `Trial Week` package: 7 days, S$0, Energise East and West, one per member ever. Self-serve from the "no active package" state. Entitlement, booking and expiry treat it as any other membership.
- **Payments.** Stripe Checkout with a webhook that marks `member_packages` paid; nothing is reconciled by hand. One-off purchases of packs and memberships offer PayNow first (1.3%, confirmed by webhook like any other method), with cards, Google Pay and Apple Pay alongside. The free trial week collects a card up front and rolls into a paid membership at day seven unless cancelled, with a reminder before the charge and one-tap cancel; PayNow cannot be charged again later, so that flow is cards and wallets only. Renewals charge the saved card, or the member buys the next term one-off. No manual PayNow (QR to the studio's bank account) anywhere: that is the kind that creates admin work. Built after the admin portal; webhooks also handle failed payments. Admin "record payment" stays only for legacy members. Needs a Stripe account in Teraweights' name; test mode until then.
- **Onboarding.** Three questions on first sign-in: zone, days per week, preferred time. Feeds `zone_pref`, the streak ring's weekly target and Book's default sort. Built with Profile in Session 4.
- **Packages copy.** Every package shows what it gets you in sessions ("10 credits, about five weeks at twice a week"), not just a price.
- **Credits pill** in the member header on every screen.
- **Profile photo.** Optional upload to a Supabase Storage `avatars` bucket, `profiles.avatar_url`. The initials avatar shows the photo wherever a member appears. Built with Profile in Session 4.
- **Session sheet** gets a duotone photo header and a two-line "what to expect" per class type.
- **Staff.** A third role, `event_assistant`, sees event registrations only. Roles stay a small enum that RLS understands; `profiles.staff_title` is free text ("Head Coach", "Event Assistant") so new kinds of helper never need a migration. `/admin/staff` invites by email through `admin_allowlist`.
- **Coaches.** `/app/coaches` lists who runs sessions (photo, `profiles.staff_title`, `profiles.bio`, what they coach, when next); a coach's page lists their upcoming sessions and deep-links into Book with the sheet open. Admins edit title and bio on Staff.
- **Community feed.** Replaces the Telegram channel. `announcements` is the posts table: `slug`, `category` (announcement, news, recipe, photos), `cover_url`, `images[]`, `archived_at`, plus the existing audience targeting. One-way: coaches post, members read, no comments. `/app/community` is the Feed tab; the newest post is Home's card. Admin composer at `/admin/announcements` uploads to the `posts` bucket. Body is a small markdown subset parsed by `lib/rules/post-body.ts`.
- **Personal training (direction A, packs only).** A `pt` package kind: N one-to-one sessions, booked one at a time into a coach's open hours (`pt_availability`) and confirmed instantly, one credit each (`pt_sessions`, `book_pt_session`, `cancel_pt_session` with the same cutoff as classes). Entitlement for classes ignores `pt` packs entirely. `/app/pt` is PT home and `/app/pt/book` the slot picker; `/admin/pt` is the diary and open-hours editor (coaches see their own). The coach's note per session is what the member reads afterwards; the coach's "focus this block" is `coach_assignments.notes`. Slot generation is `lib/rules/pt.ts`. No programming, no requests: nobody confirms anything by hand.
- **Not taken from ClassPass:** ratings and reviews, save/share on venues, marketing carousels before onboarding, wallet-only integrations without a processor.

## Seed data is sacred
`supabase/seed.sql` implements brief section 11 exactly. Demo member is Aisyah Rahman. Do not invent different names, dates, or times — the demo script depends on them. `npm run db:reset` must reset and reseed cleanly.

## Design
Brief section 10. Black base, off-white surfaces, red `#B11226` accent. Barlow Condensed headings, Inter body. Members are "Energisers". Class badge colours: East red, West blue, PRIME yellow, Fitness Engine outline. Keep copy short. No emoji in UI chrome.

## Conventions
- Dates: store UTC, display Asia/Singapore. Use `date-fns-tz`.
- Money: `numeric` in SGD, display `S$58`.
- Times in results: store seconds, display `mm:ss`.
- Every list has an empty state. Every action has a loading state and an error toast.
- No `localStorage` for app state.
- Commit after every session with a message naming the session number.

## Out of scope — do not build
Auto-renewing subscriptions (for now), push notifications, two-way chat or comments, ratings/reviews, PT programming (plans and logging), PT session requests, MyZone, public marketing site, native builds, i18n.

## When unsure
Prefer the brief. If the brief is silent, choose the simplest thing that keeps the demo script (section 13) working, and note the decision in `docs/DECISIONS.md`.
