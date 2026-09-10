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
- **Demo sign-in addresses.** The seed originally used `@teraweights.test` and `admin@stackform.test`, which no mail server can deliver to, so nobody could receive an email OTP code on a hosted project. Demo accounts now use plus-aliases of one real inbox (`hafizishk+aisyah@gmail.com` and so on), which all land in a single mailbox. Member names, dates and times are untouched. The reset step deletes seeded users by their fixed ids rather than by email pattern, so changing the address again never orphans an account.
- **Announcement audience.** Filtered in the server query by `zone_pref`, plus `prime` when the member holds a PRO package. The brief suggested client-side filtering; doing it in the query is simpler and shows the same thing.

## Home redesign — direction A ("Pulse")

- **Direction.** Three Home directions were mocked up on a design canvas (people-first, coach-voice-first, next-goal-first). The client chose people-first: a full-bleed photo hero for the next booked session showing who else is in, a three-tile community pulse, the week's remaining sessions ranked by who's going, and the latest announcement as a post from a named coach.
- **Sharing attendance.** Members can only ever read their own bookings under RLS, so "who's in" needs `session_attendees()`, a definer function in `0003_community.sql` that returns names only for members with `profiles.share_attendance = true` (always including the caller). It is on by default with an opt-out coming in Profile, because a community feature that starts empty demonstrates nothing; a member who opts out disappears from every list but still sees themself.
- **Community pulse.** `community_pulse()` returns distinct Energisers who attended this Singapore week and sessions still to come this week. Both are definer functions because members cannot count other people's bookings.
- **Streak ring.** The number is the week streak from brief section 7 (consecutive Mon–Sun weeks with an attended booking; the current week counts once it has one, so a streak is not "broken" on Monday morning). The ring fills with this week's attended sessions against a target of 3, so it moves every time the member trains rather than once a week. A daily streak was considered and rejected: the programme is two to four sessions a week, so daily streaks would almost always read as broken. The rule lives in `lib/rules/streak.ts` and is reused by My PA.ROX.
- **Photography.** `public/photos/*.jpg` are stock placeholders, one per class type plus one for events, shown under a black-and-red duotone (`DuotonePhoto`). Any photo of a session or the reservoir will sit on-brand once swapped in; the client has been asked for their own. Files are kept under 50 KB each.
- **Announcement author.** The seeded East reminder is now authored by Faizal (coach) rather than the admin, so the post on Home carries a coach's name. Title, body and dates are unchanged.
- **Invite a friend** links to Events, where Friends & Family Morning is the invite mechanism the brief already has. No separate share flow.

## Scope changes — 10 Sep 2026 (agreed with Stackform)

The brief put payments out of scope. After reviewing ClassPass, Stackform changed that. CLAUDE.md carries the new scope list; the reasoning is here.

- **Free trial week.** Modelled as a package (`Trial Week`: membership, 7 days, S$0, Energise East and West, `is_trial = true`) rather than a special case, so entitlement, booking, waitlist and expiry treat it like any membership. `variant` is null, so it covers weekday and weekend sessions; PRIME and Fitness Engine stay locked. `start_trial()` in `0004_trial.sql` is a definer function because members cannot write `member_packages`; it enforces one trial per member ever (a partial unique index catches concurrent taps) and refuses while a paid membership is active. Credit packs do not block a trial, since a drop-in member is exactly who a free week is for. The UI decides eligibility with `lib/rules/trial.ts`; SQL re-checks. Offered from the no-package state on Home and from the blocked state in the session sheet. Priya stays eligible in the seed, which makes the demo's "blocked state" a conversion moment.
- **Payments via Stripe Checkout, not a wallet alone.** Google Pay is a wallet on top of a processor. Stripe Checkout in Singapore gives PayNow, GrabPay, Google Pay, Apple Pay and cards in one integration, with a webhook marking the package paid. One-off purchases of the 1, 4, 8 and 12-month terms first; auto-renewing subscriptions later because they bring failed-payment handling. Blocked on a Stripe account in Teraweights' name (brief open question 8); test mode until then. Built after the admin portal so the webhook has somewhere to land. Admin "record payment" stays for cash and legacy.
- **Taken from ClassPass:** the one-question-per-screen onboarding (zone, days per week, preferred time), price expressed as sessions, a photo header and "what to expect" on the session sheet, a credits pill in the header, and an optional profile photo. All land in Session 4 with Profile.
- **Not taken:** ratings and reviews (a marketplace pattern; one crew and one coach), save/share on three venues, four marketing screens before onboarding.
