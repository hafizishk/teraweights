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

## Session 3 — Events + My PA.ROX

- **Registration in SQL, for the same reason as bookings.** Slot capacity needs a row lock and "18 registered" needs other people's rows, which RLS hides. `0005_events.sql` adds `register_for_event`, `cancel_event_registration`, `event_slot_counts` and `event_registration_counts` as definer functions. Members call them with their own identity; the guest server action calls with the service role, which is the one sanctioned use besides CSV import, so `auth.uid()` is null inside and the guest rules apply (public event, no account required, name and email present, email not already registered).
- **Event waitlist promotion completes in SQL.** Unlike sessions, an event registration carries no entitlement to resolve, so cancelling promotes the earliest waitlisted entry in the same slot inside the function.
- **Public event page.** Guests use `/events/<slug>`, outside the signed-in `/app` tree, with a name, email and phone form. A signed-in member landing there is sent to `/app/events/<slug>`. PA.ROX pages tell guests to sign in, since results follow an account. Guest registrations are claimed on sign-up by the existing trigger.
- **Leaderboard visibility** follows the Session 1 rule: a member sees an event's results when they took part or registered. Anyone else sees an honest "visible to Energisers who took part". Divisions order Open, Doubles, Relay, Family.
- **Personal best** is the fastest time across PA.ROX and Kampung Grind editions, which makes Aisyah's PB the 41:05 from August as the demo script expects. Community events never count. Deltas are edition to edition, chronologically.
- **Streak and month counts** on My PA.ROX reuse `lib/rules/streak.ts` from Home, so the two screens can never disagree.

## Session 4 — Profile, onboarding, check-in, polish

- **QR check-in without database rotation.** The brief wants a rotating QR. Rather than a cron that rewrites `sessions.qr_secret`, the secret is fixed per session and the QR carries an HMAC of the session id and a 60-second window index (`lib/rules/checkin.ts`). The roster screen re-renders the QR every minute; a photo of it is useless a minute later. The current and previous window are accepted so a scan on the boundary still works. Check-in opens 30 minutes before start and closes at the end time; both constants live in the rule.
- **Third use of the service role.** Members can never read `qr_secret`: `0006` revokes the column from `anon` and `authenticated` and grants the other columns back explicitly, and `session_qr_secret()` returns it to admins and the session's coach only. Validating a scan therefore needs the service role, which `lib/actions/checkin.ts` uses after the pure rule says the token is good. CLAUDE.md now lists this alongside guest registration and CSV import.
- **Scanner.** In-app scanning uses the `BarcodeDetector` API where it exists (Chrome on Android). Elsewhere the phone's camera app reads the same QR and opens `/app/checkin?s=&t=` directly, so the fallback is an instruction rather than a second library. The check-in landing page is exempt from the onboarding redirect so a brand-new member's first scan still works.
- **Onboarding** is three single-question screens (zone, sessions a week, mornings or evenings) writing `zone_pref`, `weekly_target` and `preferred_time`, with `onboarded_at` marking completion. Skipping still stamps `onboarded_at`, so nobody is asked twice. Seeded members are marked onboarded except Priya, so the demo can show first sign-in leading into the trial offer. The check runs in each member page (`lib/onboarding.ts`) rather than the member layout: a redirect thrown from a layout shared by the source and target routes loops during client-side navigation.
- **Weekly target drives the ring.** The streak ring on Home now fills against the member's own target instead of a fixed 3, and package copy ("6 credits, about 3 weeks at 2 a week") uses the same number.
- **Book default.** Book opens on the member's zone. Sessions in their preferred time band get a "Your usual" tag rather than being sorted first, so the chronological order the brief specifies is kept.
- **Profile photo.** Optional, uploaded from the browser straight to a Supabase Storage `avatars` bucket into a folder named by the member's id; policies allow writes only to your own folder and public reads. The image is downscaled to 512px client-side before upload. `setAvatar` accepts only URLs inside the caller's folder. `session_attendees()` now returns the photo, so the initials avatar shows it wherever a member appears.
- **Attendance sharing** stays on by default (Session 3 reasoning) and is now a switch on Profile.
- **Header pill** reads the active packages once in the member layout: "Free week", "PRO", "Weekday", "6 credits" or "No package" in red, linking to Profile.
- **Not built here:** payments (after the admin portal), push notifications. "Install" is a prompt on Profile using `beforeinstallprompt`, with a written hint on iOS.
- **Dev sign-in switcher.** Supabase's built-in mailer allows a handful of auth emails an hour, and a free Resend account without a verified domain delivers only to the account owner's exact address, so the plus-aliased demo accounts cannot receive codes yet. `/dev/login` lists seeded accounts and signs in as one by minting a magic-link token with the service role and completing it through the normal `/auth/callback`. It is on only when `DEV_LOGIN_ENABLED=true` and never in a production build. Real email sign-in for the demo needs a sending domain verified in Resend.

## Session 5 — Admin portal

- **Admin writes run under RLS, not the service role.** Every table already carries an `is_admin()` policy from Session 1, so the portal uses the ordinary signed-in client and the database decides. `lib/actions/guard.ts` checks the role first only so a refusal reads as a sentence instead of an empty result. The service role stays limited to guest registration, CSV import of members, QR check-in and the local dev sign-in. This is a deliberate departure from the D2D news portal, whose admin writes bypass RLS entirely.
- **Two things still need SQL.** `admin_adjust_credits` moves a balance and writes the audit row in one transaction, refusing a zero delta, an empty reason or a negative balance. `admin_cancel_session` releases every booking on a session and returns each credit, which touches rows across members under a lock. Everything else is plain CRUD.
- **Credit adjustments are an audit trail, not a column.** `credit_adjustments` records who moved what, why and when, because "she says she had seven" needs an answer. The table is only ever written by the function.
- **Cancelling a session leaves attended rows alone.** Booked and waitlisted rows are cancelled; a waitlisted row was never charged, so only booked rows refund. An attended row means the session happened and is not rewritten.
- **The QR rotates without touching the database.** Session 4 put the token on a 60-second HMAC window. The roster's fullscreen QR therefore fetches `/api/admin/session-qr` as each window closes and redraws. The session secret never reaches the browser, only the current short-lived token, which is what the QR encodes anyway. A route rather than a server action, because an action cannot be polled on a timer.
- **`qrcode` is a new dependency.** Generating a QR by hand is a few hundred lines of encoder nobody should review. Scanning in Session 4 needed no library because the browser has `BarcodeDetector`; drawing one has no equivalent.
- **Bulk create previews before it writes.** `lib/rules/schedule.ts` turns a recurrence into the exact list of instants, so the button reads "Create 9 sessions" before anything is written, and a range that would produce hundreds is refused. Singapore has no daylight saving, so a fixed offset is exact.
- **Results import re-derives on confirm.** The preview shows every row, how it matched and its rank. Confirming sends the same CSV again and the server re-parses and re-matches rather than trusting what came back from the browser. An import replaces the event's existing results, so a corrected file can simply be uploaded again.
- **Matching prefers email, then a unique name.** Paper sign-up sheets rarely carry an address, so a unique full-name match is the fallback. Two members with the same name leaves the row unmatched rather than guessing, and unmatched rows are only imported if the admin ticks the box.
- **Ranks share and skip.** Equal times share a rank and the next rank skips, the way a printed results sheet reads.
- **Coaches see a filtered portal, not a different one.** The same dashboard, schedule and roster screens check the role and drop to the coach's own sessions, and the sidebar hides members, packages, events and announcements. RLS enforces the same boundary underneath: `coaches_session` and `coaches_member` decide what a coach can read, and `session_qr_secret` gives them the QR for their own sessions only.
- **Retiring a package rather than deleting it.** `is_active` hides a package from new assignments while every member already holding one keeps it. Deleting would orphan live memberships.
- **The registrations export is a route handler**, because a server action cannot return a file download. It is the second of the two API routes the brief anticipated.

## Staff and payments — 10 Sep 2026

- **Payments go card-only.** The client's words: "I do not want PayNow. I want to reduce admin duties." PayNow and GrabPay are push payments with nothing stored, so a trial cannot roll into a charge and every renewal is a manual reconciliation. Cards and wallets through Stripe can be charged again. The trial therefore collects a card up front and converts at day seven unless cancelled. That will cut trial starts and raise conversion; the client has chosen that trade. The manual "record payment" path stays for legacy members only. CLAUDE.md carries the new wording.
- **A third staff role rather than a permissions matrix.** Coaches run sessions; event helpers work a registration list and should see nothing else. `event_assistant` gets read and update on `event_registrations` plus the names attached to them, through `is_event_staff()` and `has_event_registration()`. Creating events, waves, results, packages and credits stay admin-only. A full permissions system was considered and rejected: three roles cover the actual people, and RLS policies on an enum are auditable in a way a matrix is not.
- **Job title is free text.** Permissions follow the role; `staff_title` is what shows next to their name. "Head Coach", "Physio" and "Event Assistant" are display strings, so a new kind of helper is a text field, not a migration.
- **Invites go through the allowlist.** `admin_allowlist` already stamps a role on first sign-in. `/admin/staff` writes to it, so an invite for someone without an account is one row, and the role is waiting when they arrive. Removing someone from staff also removes the allowlist row, or the role would come straight back.

## Polish pass — ruled, not boxed

- **Sections divide with a hairline, not a card.** The member app had grown a card around every block, and on a black base that reads as a grid of grey boxes. `Card` now defaults to a top rule with the black showing through; `raised` is kept for the few things that are objects on the page, such as the session sheet and an alert.
- **The numerals are the graphic.** `Scoreboard` is a ruled row of big tabular figures with a quiet label under each. Home's community pulse and My PA.ROX's stats both use it, so the two never drift. Admin stat cards follow the same shape.
- **Eyebrows are sentence case.** Small labels stop being tracked-out uppercase; the condensed display face is loud enough on its own. Display tracking drops to zero for the same reason.
- **Book reads as a timetable.** Big time on the left, badge and venue in the middle, spots on the right, with a day rule between groups. The same row shape carries "Booked" and "Full" so the eye lands in the same place every time.
- **Bottom tabs are text-only.** Five condensed labels, the active one in paper, no icons to draw. The brief asks for no emoji in chrome; this goes one step further.

## Session 6 — Coaches and the community feed

- **The feed extends `announcements`.** Two tables that both mean "a coach told the crew something" would drift, and Home's card should be the newest post from the same source. The table gained a slug, a category, a cover, a gallery and an archive timestamp; the published-read policy from Session 1 still gates it, now excluding archived rows. Drafts stay invisible at the database level.
- **What was taken from the D2D news portal, and what was not.** Taken: RLS as the read contract, slug with collision retry, byte-safe uploads compressed in the browser, date-prefixed random storage paths, the markdown-ish body subset with one shared parser. Not taken: service-role writes (ours run under RLS as the admin), the three-state client cache (server components fetch per request), schema-drift fallback queries (we have a migration runner) and hard delete (published posts archive; only drafts delete).
- **A slug trigger, not just application code.** The server action derives a slug and retries on collision, and the database does the same on insert, so the seed and any future import cannot create a post without a link.
- **One-way by design.** Coaches post, members read. Comments would bring moderation, and the brief rules out chat.
- **Six tabs.** "Feed" earns a tab: it is the Telegram replacement, which is the pitch. Labels shrink one size to fit.
- **Coaches are derived, not declared.** A coach is anyone with a staff role who has a session in the next four weeks or a bio. Their classes and next session come from the schedule, so the page is never stale. Bio and title are edited on the Staff screen.
- **A coach's sessions deep-link into Book** with the sheet already open, rather than duplicating the booking sheet on a second screen.

## Session 7 — Personal training, direction A

- **Why A.** Three directions were mocked up: PT you book from a pack, programme-led coaching, and request-and-confirm. The client's brief for everything since the trial has been "less admin", and only A has no human in the loop: buy a pack, book a slot, done. B (programmes and logging) can sit on top of A later without changing the data model; C would have put a coach in front of every booking.
- **Packs only.** A PT pack is a package of kind `pt` with N credits, so assignment, payment recording, credit adjustment, expiry and the profile list all work unchanged. Per-session purchase was offered and declined.
- **A PT pack can never pay for a class.** `lib/rules/entitlement.ts` only considers membership, credits and dropin; `book_pt_session` only considers `pt`. Both sides are explicit rather than relying on a default branch.
- **Slots are derived, not stored.** A coach declares open hours (weekday, from, to, slot length, venue). `lib/rules/pt.ts` turns them into bookable instants minus anything already taken, and `pt_taken_slots()` returns those windows without saying who took them. Class sessions the coach runs are taken windows too, so PT can never overlap a class. The database re-checks every rule on booking.
- **Twelve hours' notice, two weeks ahead.** A coach should not find a 6am PT in their diary at 11pm. Both numbers live in the rule.
- **Same cancellation cutoff as classes.** Outside six hours the session returns to the pack; inside, the coach's hour is already lost. An admin cancelling on a member's behalf always returns it, through the audited credit adjustment.
- **The note is the product.** Each session carries a title and a coach note the member reads on their PT page. Compliance rings and programmes are not built; a coach who writes two lines after each session gives the member most of that.
- **PT demo lives on Marcus, not Aisyah.** The brief describes Aisyah exactly and the demo script toggles her coach on live. Marcus holds a PT 8-pack with five left, three past sessions with notes and one booked, so the screen is full without touching her.
- **Faizal's open hours in the seed** are Tue and Thu 6 to 9am, Tue 6:30pm before East, and Sat 9 to 11am.
- **Buying a pack in the app waits for payments.** Until Stripe lands, the PT page lists the packs and says to ask at a session; admin assigns them from the member page like any other package.

## Payments — PayNow through Stripe is back in

- **Two PayNows.** The earlier note dropping PayNow conflated manual PayNow (a QR to the studio's bank account, matched to a member by hand) with PayNow through Stripe, where Checkout shows the QR and the webhook marks the package paid on its own. Only the manual kind creates admin work.
- **So:** one-off purchases offer PayNow first at 1.3%, cards and wallets alongside at 3.4% plus S$0.50. The trial that rolls into a membership stays cards and wallets, because PayNow cannot be charged again a week later. Renewals charge the saved card or the member buys the next term one-off.
- **Fees on their prices**, local card versus PayNow: a S$260 pack keeps S$250.66 or S$256.62.

## Tabs — five, with You in the middle

- **Five tabs, You raised.** Home, Book, You, Feed, Events. You is a circle carrying the member's own photo or initials, lifted above the bar the way the MLS app lifts Clubs. The four words stay in the display face; the circle is the one graphic element in the chrome.
- **PA.ROX moves under You.** The You page opens with three rows: My PA.ROX, Personal training, Coaches. Demo script step 4 is one tap further: You, then My PA.ROX. Those routes light the You tab so the member never feels lost.
- **Why not six.** Six words at 390px meant shrinking the type, and the brief's tone is bold. Five with a centred anchor reads as a product rather than a menu.

## Account in the header, You as the training hub

- **Avatar top right.** The member's photo or initials sits next to the credits word in the header on every screen, the way the MLS app puts the person icon beside the menu. Tapping it opens `/app/account`: photo, name, phone, email, zone, weekly target, usual time, roster sharing, install, log out. Who you are, opened rarely.
- **You is what you train on.** The tab opens with Packages (what you're on, credits left, expiry), then My PA.ROX, Personal training, Coaches. No form fields there any more; one quiet row points to Account. The header word and the Home membership bar still link to You, since that is where packages live.
- **Why split.** One page carrying settings, packages and three destinations felt like a menu. A photo in the header is the settings entry every app trains people on; the tab is free to be the member's own dashboard.

## Home and You are one screen; PA.ROX gets the fifth tab

- **One landing screen.** Home showed the membership bar, a PT card and a coaches strip; You repeated them as packages, a PT row and a Coaches row. Now `/app` is You: hero, pulse, who's training, latest post, coaches, PT, then the full packages list (the no-package and free-week block stays at the bottom when there is nothing active). `/app/profile` redirects there so old links survive.
- **Tabs: Book, Feed, You, Events, PA.ROX.** Merging freed a slot and PA.ROX earns it: the community's signature event and the demo's showpiece, no longer two taps deep. Demo script step 4 is the PA.ROX tab again.
- **Account stays in the header.** Photo, name and settings behind the avatar top right; the tab is the member's own dashboard.

## Packs tab, and pushing people who have nothing

- **The gap was a Packs tab.** Someone with no package landed on You and found the free week at the bottom of the screen, and the catalogue only existed in admin. Now `/app/packs` shows everything on sale from the `packages` table: the trial card for anyone still eligible, memberships as one card per plan (Weekday, Weekend, West, PRO) with a 1, 4, 8, 12 month switch, per-month price and "1 month free" derived from validity beyond the paid term, credit packs and the drop-in, PT packs, then three lines of basics. Buy buttons show the price and, until Stripe lands, toast "Checkout is coming". Nothing is recorded by hand.
- **PA.ROX goes back under You.** Tabs are Book, Packs, You, Feed, Events. Personal results are personal, so My PA.ROX is a card on You (personal best, events completed); the PA.ROX event itself is under Events. Demo script step 4: You, then the My PA.ROX card.
- **Stage decides the push.** `memberStage` in `lib/rules/packs.ts` reads the member's class packages (PT packs never count): new, lapsed (last pack ended on a date), trial (days left), low (credits at 2 or fewer, or a membership inside 14 days), fine. `StageNudge` under the hero renders the free week with its button, "Pick up where you left off", "Free week ends in 2 days", "Running low, top up" or "Time to renew", and nothing at all when things are fine. The empty hero reads "Ready when you are, see packs" instead of "Book a session" when there is nothing to book with. Blocked sessions, the header word and the packages list all link to Packs; no copy says "contact us" any more.
- **Highlight on Packs.** The plan the member is on or was last on carries a "For you" badge, or Energise X when credits are the thing running low, or Weekday for a newcomer. The trial card takes precedence.

## Email deliverability

- **Resend on `stackformstudios.com`.** DKIM (`resend._domainkey`), the two SPF CNAMEs (`rsend`, `send`) and a `_dmarc` record with `p=none` live in Squarespace DNS. Resend's SPF sits on the `send` subdomain, so Google Workspace's root SPF for the same domain is untouched. Sender is `noreply@stackformstudios.com` until Teraweights own a domain, then it moves.
- **Code first, link second.** `supabase/templates/magic-link.html` replaces Supabase's default Magic Link email. The 6-digit `{{ .Token }}` is the headline, the link is a small fallback. A short branded email with one link reads far less like phishing than a bare button, which matters while a new sending domain has no reputation.
- **Expect spam on the first sends.** A domain that has never sent mail has no reputation. Marking the first few as "not spam" and replying to one from the receiving account is what actually moves Gmail. Do this before any client demo.
