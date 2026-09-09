# Decisions

Choices made where the brief is silent or ambiguous. Keep the demo script (brief section 13) working.

## Session 1 — Foundation

- **Admin allowlist.** `admin_allowlist(email, role)` table. The `handle_new_user` trigger assigns the role on first sign-in. Seeded: `admin@stackform.test` → admin, `faizal@teraweights.test` → coach. Members cannot read it.
- **Role escalation guard.** The `profiles` self-update policy's `with check` requires `role` to be unchanged, so a member cannot promote themself. Only admins change roles.
- **Coach display rows.** Any signed-in user can read `profiles` rows whose role is coach or admin. Session cards show the coach's name; the brief's "coach reads members in their sessions" rule still holds via `coaches_member()`.
- **Leaderboard visibility.** `event_results` readable when the member is registered for the event *or* has a result in it (`can_view_event_results()`). Past events seed `attended` registrations for every matched member so both paths hold.
- **Guest claim.** On sign-up, `handle_new_user` attaches guest registrations and their results with the same email to the new profile (brief section 2).
- **`late_cancel` column** added to `bookings` so late cancels can be counted on the member record (section 7) without a separate table.
- **Aisyah's membership expiry** set explicitly to 28 Sep 23:59 SGT (1 Jun + 120 days is 29 Sep). The demo script says "expires 28 Sep", so the demo wins.
- **Attendance history.** Energise East sessions are seeded from 20 Jul so Aisyah's 14 attended sessions have real rows: Tue/Thu 8pm across 8 consecutive weeks up to 8 Sep (streak 8, 3 this month). West, PRIME and Fitness Engine are September only.
- **Full session for the demo.** Sun 13 Sep 07:30 East has capacity 6 with 6 booked and 1 waitlisted (Siti), because 12 seeded members cannot fill a 20-capacity class.
- **Demo anchor.** Sessions with `ends_at` before Wed 9 Sep 2026 12:00 SGT are seeded as `completed`. Re-seed before the demo.
- **Station splits.** Seeded PA.ROX results carry 9 stations whose seconds sum exactly to `total_seconds`. Kampung Grind results have no splits.
- **Ranks** are computed per event and per division at seed time.
- **PWA.** Manual manifest + service worker (`public/sw.js`): network-first for pages, cache-first for static assets, `/offline` fallback. Registered only in production builds.
- **Local schema check.** `npm run db:check` runs the migration and seed against a throwaway Postgres using `scripts/pg-shim.sql` for the `auth` schema, then asserts the section 11 invariants and RLS behaviour. This is not a substitute for `supabase db reset`, but it catches SQL errors without a Supabase project.
