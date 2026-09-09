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

## Session 2 — Home + Book

- **Where the booking effects live.** RLS deliberately stops members writing `member_packages`, so deducting and refunding credits cannot happen from a server action directly. `0002_booking_functions.sql` adds three security-definer functions: `apply_booking`, `cancel_booking` and `promote_booking`. They enforce integrity only — capacity under a row lock, ownership, payment status, expiry, `allowed_class_types`, non-negative credits. The *choice* of which package pays stays in `lib/rules/entitlement.ts`, as CLAUDE.md requires.
- **Two constants that must agree.** `CANCELLATION_CUTOFF_HOURS` (6) and `BOOKING_CLOSES_HOURS_BEFORE` (1) are canonical in `lib/rules/`. The SQL functions `cancellation_cutoff_hours()` and `booking_close_hours()` mirror them because the server must re-derive the cutoff rather than trust a client-supplied one. `scripts/db-booking-test.sql` asserts the SQL values, so drift fails `npm run db:check`.
- **Roster counts.** "3 left" needs a count of other people's bookings, which RLS hides. `session_counts(from, to)` is a definer function returning counts only, never who is booked.
- **Waitlist promotion.** `cancel_booking` names the earliest waitlisted booking but does not promote it. The server action then resolves that member's entitlement with the same TS rules and calls `promote_booking`. When RLS hides the promoted member's packages from the canceller, or nothing covers the session, they keep their waitlist place rather than being promoted unpaid. In-app notification of promotion is not built; they see it on Home.
- **Entitlement ordering.** Within a category, the soonest-expiring package is used first, so a lapsing credit pack is spent before a later one. The brief only says "the first that applies".
- **Rebooking.** `bookings` has a unique key on (session, member), so rebooking after a cancellation updates the existing row rather than inserting a second one.
- **Server-resolved view models.** `lib/view/session-view.ts` turns a session plus counts, the member's booking and their packages into everything the UI shows: button label, spots label, cancellation warning. The client never re-derives a business decision.
- **Cancellation confirm.** A cancellation that would forfeit a credit needs a second tap; the warning text comes from `cancellationOutcome`. Membership bookings cancel in one tap at any time.
- **Announcement audience.** Filtered in the server query by `zone_pref`, plus `prime` when the member holds a PRO package. The brief suggested client-side filtering; doing it in the query is simpler and shows the same thing.
