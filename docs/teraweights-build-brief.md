# Teraweights App — Build Brief (Test Build)

**Client:** Teraweights (Train With Teraweights), Singapore
**Builder:** Stackform Studios
**Deadline:** Demo-ready in one week
**Deliverable:** Working PWA (member app) + admin portal, seeded with real schedule, deployed on Vercel

---

## 1. Why this exists

Teraweights runs four products with no system connecting them:

| Rung | Product | Today's tooling |
|---|---|---|
| 1. Acquire | Kampung Grind / Friends & Family (free, public) | Calendly + Instagram QR |
| 2. Retain | Energise Bootcamp East / West (weekly classes) | Telegram bot + pinned pricing image |
| 3. Upsell | PRIME, Fitness Engine, PT | Google Forms + PDFs + DM keywords |
| 4. Aspire | PA.ROX (Hyrox-style race with PAssion Wave) | Calendly, no results kept |

274 Telegram subscribers. Eight disconnected tools. No member record that follows a person up the ladder.

**The app is the one record.** A member books classes, registers for events, sees their PA.ROX times, and gets announcements in one place. Admin sees rosters, checks people in by QR, grants credits, uploads results, and broadcasts.

**Not building:** public marketing site (not requested), payments (admin records manually), chat/feed, PT programming, MyZone integration.

---

## 2. Assumptions made (confirm with client)

- **PT tier:** appears only as a "My Coach" card on Home when a coach is assigned. No PT booking flow in v1.
- **Event registration:** guests may register for public events (Kampung Grind, Friends & Family) with name + email + phone, no account. PA.ROX requires an account. Guest registrations can be claimed later when they sign up with the same email.
- **Packages are mostly memberships, not credits.** From the 28 Aug pricing post: Energise (Weekday / Weekend / West) and Energise PRO are monthly memberships sold in 1, 4, 8 and 12-month terms. Energise X is a 10-credit pack valid 3 months. Energise + is a $20 drop-in. See section 11 for the full table.
- **Variant choice:** "Energise Weekday, Weekend & West" is read as three variants at one price — a member picks one. Weekday = Tue/Thu/Wed 8pm sessions, Weekend = Sat/Sun morning sessions, West = all West sessions. Confirm.
- **Energise PRO = PRIME.** The pricing table says PRO, the schedule says PRIME. Treated as the same tier (PRIME sessions + all Energise sessions). Confirm.
- **Free months** on 8/12-month terms are modelled as longer validity (9 and 14 months). **Fitness Engine inclusions** are granted as separate FE credits on purchase. **Cashback system** mechanics unknown — stored as an eligibility flag only, no logic.
- **East venue:** Bedok Reservoir Road (from website). **West venue and PRIME gym:** unknown, placeholders.

---

## 3. Personas and roles

| Role | Who | Sees |
|---|---|---|
| `member` | Energiser with a package | Home, Book, Events, My PA.ROX, Profile |
| `coach` | Trainer running sessions | Member views + today's roster + QR check-in |
| `admin` | Owner / ops | Everything + admin portal |
| Guest | Public, no login | Public event page + registration form only |

---

## 4. Stack

- **Next.js 15, App Router, TypeScript, Tailwind** — same as D2D
- **Supabase** — Postgres, Auth (email OTP for test; phone OTP later), RLS, Storage for images
- **PWA** — `next-pwa` or manual manifest + service worker. Install-to-home-screen. No app store for the test.
- **Vercel** — preview deploys per branch, production on a subdomain (e.g. `app.teraweights.com` or a Stackform-owned test domain)
- **Reuse from D2D:** role-based RLS pattern, rotating QR check-in (`qr_secret` + short TTL), PayNow "record payment" flow, allowlist approach for admin accounts
- **Charts:** none needed for test. Simple text stats.

---

## 5. Scope

### In (member app)
1. **Home** — next booked session, credits remaining + expiry, latest announcement, My Coach card (conditional), upcoming event teaser
2. **Book** — week view of sessions filtered by class type (East / West / PRIME / Fitness Engine). Tap → session detail → Book / Join waitlist / Cancel. Shows spots left.
3. **Events** — list of upcoming events. Tap → event detail with slot picker → Register. Past events show "View results".
4. **My PA.ROX** — every PA.ROX / Kampung Grind the member has a result for. Total time, rank, division, station splits if present. PB highlighted. Attendance streak and sessions-this-month at the top.
5. **Profile** — name, phone, zone preference, packages (active + expired), logout.

### In (admin portal — `/admin`)
1. **Dashboard** — today's sessions with booked/capacity, pending payments count, upcoming events
2. **Schedule** — create/edit/cancel sessions. Bulk-create recurring (e.g. "Energise East every Tue/Thu 8pm for September").
3. **Sessions → Roster** — per session: list of booked/waitlisted, mark attended/no-show, show rotating QR for check-in
4. **Members** — list, search, view member, assign package, record payment, adjust credits, assign coach, change role
5. **Packages** — CRUD
6. **Events** — create/edit, manage slots + capacity, view registrations, export CSV, **upload results CSV**
7. **Announcements** — create, choose audience (all / East / West / PRIME), publish

### In (coach view)
- Today's sessions → roster → QR check-in. Same components as admin, scoped by RLS to sessions they coach.

### Out
- Payments gateway, push notifications, chat, PT programming, MyZone, public marketing site, native app store builds, refunds logic beyond credit return.

---

## 6. Data model

```sql
-- roles: member | coach | admin
profiles (
  id uuid pk references auth.users,
  full_name text, phone text, email text,
  role text default 'member',
  zone_pref text,            -- east | west | null
  created_at timestamptz
)

class_types (
  id uuid pk, slug text unique,   -- energise_east | energise_west | prime | fitness_engine
  name text, credit_cost int default 1,
  colour text, default_capacity int default 20
)

venues (
  id uuid pk, name text, address text, zone text, map_url text
)

sessions (
  id uuid pk,
  class_type_id uuid fk, venue_id uuid fk, coach_id uuid fk profiles null,
  starts_at timestamptz, ends_at timestamptz,
  capacity int,
  status text default 'scheduled',   -- scheduled | cancelled | completed
  qr_secret text, qr_rotated_at timestamptz,
  notes text
)

packages (
  id uuid pk, name text, description text,
  kind text,                         -- membership | credits | dropin
  tier text,                         -- energise | pro
  variant text null,                 -- weekday | weekend | west | null (pro/credits/dropin)
  term_months int null,              -- membership: 1 | 4 | 8 | 12
  validity_days int,                 -- membership: term + free months; credits: 90; dropin: 1
  credits int null,                  -- credits/dropin only
  price_sgd numeric,                 -- total price
  price_per_month numeric null,      -- display only
  allowed_class_types text[],        -- slugs
  fe_credits_included int default 0, -- Fitness Engine sessions granted on purchase
  cashback_eligible bool default false,
  perks text[],                      -- display only
  is_active bool default true
)

member_packages (
  id uuid pk, member_id uuid fk, package_id uuid fk,
  kind text,                         -- copied from package
  starts_at timestamptz, expires_at timestamptz,
  credits_total int null, credits_remaining int null,   -- credits/dropin only
  fe_credits_remaining int default 0,
  payment_status text default 'pending',   -- pending | paid
  payment_ref text, recorded_by uuid null,
  purchased_at timestamptz
)

bookings (
  id uuid pk, session_id uuid fk, member_id uuid fk,
  member_package_id uuid fk null,
  status text,            -- booked | waitlisted | cancelled | attended | no_show
  entitlement text,       -- membership | credit | fe_credit
  credits_used int default 0,
  created_at timestamptz, cancelled_at timestamptz, checked_in_at timestamptz,
  unique (session_id, member_id)
)

events (
  id uuid pk, slug text unique, name text,
  type text,              -- parox | kampung_grind | community
  description text, cover_url text,
  event_date date, venue_id uuid fk,
  is_free bool, price_sgd numeric null,
  is_public bool,         -- guests may register
  requires_account bool,  -- true for PA.ROX
  registration_open bool,
  partner_line text       -- e.g. "In collaboration with PAssion Wave"
)

event_slots (
  id uuid pk, event_id uuid fk, label text, starts_at timestamptz, capacity int
)

event_registrations (
  id uuid pk, event_id uuid fk, slot_id uuid fk null,
  member_id uuid fk null,
  guest_name text, guest_email text, guest_phone text,
  status text default 'registered',   -- registered | waitlisted | cancelled | attended
  payment_status text default 'n/a',  -- n/a | pending | paid
  created_at timestamptz
)

event_results (
  id uuid pk, event_id uuid fk,
  registration_id uuid fk null, member_id uuid fk null,
  display_name text,
  division text,           -- open | doubles | relay | family
  total_seconds int, rank int,
  station_splits jsonb,    -- [{station:"1km run", seconds:312}, ...]
  imported_at timestamptz
)

announcements (
  id uuid pk, title text, body text,
  audience text default 'all',   -- all | east | west | prime
  published_at timestamptz null, created_by uuid
)

coach_assignments (
  id uuid pk, member_id uuid fk, coach_id uuid fk, notes text, created_at timestamptz
)
```

### RLS summary
- `profiles`: user reads/updates own; admin reads all; coach reads members booked into their sessions.
- `sessions`, `class_types`, `venues`, `packages`: public read; admin write.
- `bookings`: member CRUD own; coach reads for own sessions; admin all.
- `member_packages`: member reads own; admin all.
- `events`, `event_slots`: public read where `is_public` or authenticated; admin write.
- `event_registrations`: member reads own; guest insert via server action (service role) only; admin all.
- `event_results`: member reads own + rows for events they registered for (leaderboard); admin write.
- `announcements`: authenticated read where published; filter by audience client-side using `zone_pref` (simple for test); admin write.
- `coach_assignments`: member reads own; coach reads own; admin all.

---

## 7. Business rules

- **Booking window:** opens when session is `scheduled`; closes 1 hour before `starts_at`.
- **Entitlement resolution (in order):** on booking, find the first that applies among the member's active (`paid`, not expired) `member_packages`:
  1. A `membership` whose `allowed_class_types` includes the session's class type **and** whose `variant` matches the session (weekday variant → Mon–Fri sessions; weekend → Sat/Sun; west → West class type; PRO → anything). Booking is included, `entitlement='membership'`, `credits_used=0`.
  2. For Fitness Engine sessions: a package with `fe_credits_remaining > 0` → deduct 1, `entitlement='fe_credit'`.
  3. A `credits` or `dropin` package with `credits_remaining > 0` that allows the class type → deduct 1, `entitlement='credit'`.
  4. Otherwise block with "No active membership or credits. Contact us." (No self-serve purchase in the test.)
- **Cancellation:** ≥ 6 hours before start → status `cancelled`, credit returned if one was used. < 6 hours → credit forfeited if used (warn before confirming); membership bookings just cancel. Late cancels are counted on the member record for admin to see.
- **Waitlist:** when `bookings.status='booked'` count ≥ capacity, new bookings become `waitlisted` (no deduction). On a cancellation, promote the earliest waitlisted booking, resolve entitlement then, notify (in-app only for test).
- **Check-in:** member scans session QR → server validates `qr_secret` (rotates every 60s, reuse D2D) → sets `checked_in_at`, status `attended`. Coach/admin can also mark manually.
- **Package expiry:** `expires_at` = `purchased_at` + `validity_days`. Expired packages can't be used for booking. Home shows "expires in N days" when < 14.
- **Events:** slot capacity enforced; waitlist same as sessions. Free events → `payment_status='n/a'`. PA.ROX → `pending` until admin records payment.
- **Results import:** CSV columns `display_name, email, division, total_time (mm:ss), rank, split_1..split_n`. Match `email` to `profiles.email` → set `member_id`. Unmatched rows still stored with `display_name` for the leaderboard.
- **Streak:** consecutive calendar weeks with ≥1 `attended` booking. **Sessions this month:** count of `attended` in current month.

---

## 8. Screens — member app

Mobile-first, max-width 480px on desktop. Bottom tab bar: Home · Book · Events · PA.ROX · Profile.

### Home
- Greeting: "Hey {first name} 👋" (small, not shouty)
- **Next session card:** class type badge, day/time, venue, "Cancel" link, QR check-in button when within 30 min of start
- **Membership card:** if an active membership exists: "Energise Weekday · 4-month · expires {date}". If a credit pack exists (alone or alongside): "{n} credits · expires {date}". Both shown stacked if both exist. "Top up" → Packages (info only for test, "Contact us to top up")
- **Announcement card:** latest published for the member's audience
- **My Coach card:** only if `coach_assignments` row exists. Coach name, "Next PT session: contact your coach" (no booking flow)
- **Event teaser:** next upcoming event, "Register" link

### Book
- Segmented filter: All · East · West · PRIME · Fitness Engine
- Week strip (Mon–Sun), swipe/arrow to next week
- Session rows: time, class badge, venue short name, spots left ("3 left" / "Full — waitlist")
- Session detail sheet: full info, coach name, button label resolved from entitlement: "Book — included" (membership) / "Book (1 credit)" / "Book (1 FE pass)" / "No active package" (disabled) / "Join waitlist" / "Cancel booking". Cancellation warning if < 6h and a credit was used.

### Events
- Upcoming list: cover image, name, date, partner line, "Free" or price, "Register" / "Registered ✓"
- Event detail: description, venue with map link, slot picker (radio), register button. Guests see name/email/phone fields.
- Past events: "View results" → leaderboard (division filter, rank, name, time) with the member's own row highlighted

### My PA.ROX
- Header stats: streak (weeks), sessions this month, total events completed
- PB card: best PA.ROX time, which edition
- History list: each event → date, division, time, rank, delta vs previous. Tap → station splits as a simple bar list.
- Empty state: "Your first PA.ROX is on 12 Sept. Register →"

### Profile
- Name, phone, email, zone preference (East/West toggle)
- Packages: active memberships (name, term, expiry, perks list, cashback badge) and credit packs (remaining + expiry); expired collapsed
- Logout

---

## 9. Screens — admin portal (`/admin`)

Desktop-first, sidebar nav. Reuse D2D admin layout.

- **Dashboard:** today's sessions (booked/capacity, coach), pending payments count, next 3 events with registration counts
- **Schedule:** calendar or list by week. "New session" form. "Bulk create" form: class type, venue, coach, weekdays, time, capacity, date range → generates sessions.
- **Session roster:** booked list (name, credits used, checked-in ✓), waitlist, buttons: mark attended / no-show, "Show check-in QR" (fullscreen, rotating), "Cancel session" (returns all credits).
- **Members:** table with search. Member page: profile, packages (assign new → pick package → set payment status), credit adjustment with reason, bookings history, events, results, assign coach, change role.
- **Packages:** table + form.
- **Events:** table. Event page: edit details, slots table, registrations table (search, export CSV), "Import results" (upload CSV → preview matched/unmatched → confirm).
- **Announcements:** list, new (title, body, audience), publish toggle.

---

## 10. Brand and design direction

- **Palette:** black `#0B0B0B` base, off-white `#F4F1EC` surfaces, brand red `#B11226` accent (buttons, active tab, PA.ROX badge), muted grey text `#8A8A8A`. Yellow `#F2C230` only for event highlights (matches their posters).
- **Type:** condensed bold display for headings (Barlow Condensed or Oswald via `next/font`), Inter for body.
- **Motif:** the heartbeat line from the logo as a thin divider or loading state. Don't overuse.
- **Tone:** warm, community-first. Use "Energisers" for members. Copy short. No fitness-bro shouting.
- **Class badges:** East = red, West = blue `#2B6CB0`, PRIME = yellow, Fitness Engine = white outline.
- **Logo:** placeholder wordmark "TERAWEIGHTS" until client sends assets.

---

## 11. Seed data

### Class types
| slug | name | credit_cost | capacity |
|---|---|---|---|
| energise_east | Energise East Bootcamp | 1 | 20 |
| energise_west | Energise West Bootcamp | 1 | 20 |
| prime | PRIME | 1 | 12 |
| fitness_engine | Fitness Engine | 1 | 16 |

`credit_cost` is 1 everywhere; kept as a column so it can change later. PRIME is gated by membership tier, not credit cost.

### Venues
| name | zone | address |
|---|---|---|
| Bedok Reservoir Road (East) | east | Bedok Reservoir Road, Singapore (exact spot TBC) |
| West Bootcamp Venue (TBC) | west | TBC |
| PRIME Gym (TBC) | central | TBC |
| PAssion Wave @ Bedok Reservoir | east | Bedok Reservoir Park |
| PAssion Wave @ Pasir Ris | east | 125 Elias Road, Singapore 519926 |
| Pour-traits Cafe | central | TBC |

### September 2026 sessions (generate via bulk-create)
- Energise East: every Tue & Thu 20:00–21:00; every Sat & Sun 07:30–08:30
- Energise West: every Wed 20:00–21:00; every Sun 08:00–09:00
- PRIME: every Mon & Wed 18:00–21:00; every Sun 08:00–11:00
- Fitness Engine: Wed 2, 9, 16, 23, 30 (19:30–21:00 placeholder time); Sat 26 (08:00–10:00 placeholder)

### Events
| slug | name | type | date | venue | free | public | account required | slots |
|---|---|---|---|---|---|---|---|---|
| parox-sep-2026 | PA.ROX @ PAssion Wave Bedok Reservoir | parox | 2026-09-12 | PAssion Wave Bedok Reservoir | no (TBC) | yes | yes | Wave 1 07:30 (30), Wave 2 08:30 (30), Wave 3 09:30 (30) |
| friends-family-sep-2026 | Friends & Family Morning | community | 2026-09-19 | Pour-traits Cafe | yes | yes | no | 3km Walk (40), 5km Run (40) |
| kampung-grind-nov-2026 | Kampung Grind (November) | kampung_grind | 2026-11-21 (TBC) | PAssion Wave Pasir Ris | yes | yes | no | 07:30 (40), 08:30 (40), 09:30 (40) |
| kampung-grind-aug-2026 | Kampung Grind (August) | kampung_grind | 2026-08-22 | PAssion Wave Pasir Ris | yes | yes | no | (past, has results) |
| parox-jul-2025 | PA.ROX July 2025 | parox | 2025-07-12 | PAssion Wave Bedok Reservoir | — | — | — | (past, has results) |
| parox-apr-2026 | PA.ROX April 2026 | parox | 2026-04-11 | PAssion Wave Bedok Reservoir | — | — | — | (past, has results) |

### Packages (from the 28 Aug 2026 pricing post — real prices)

**Energise memberships** — one row per variant × term. Variants: `weekday`, `weekend`, `west`. Same price across variants. `allowed_class_types`: weekday/weekend → `energise_east, energise_west`; west → `energise_west`.

| term | price (total) | per mth | validity | fe_credits | cashback | perks |
|---|---|---|---|---|---|---|
| 1 mo | 65 | 65 | 30 d | 0 | yes | 10% Atlas Whey, 1 free class |
| 4 mo | 260 | 65 | 120 d | 0 | no | Top, giftbag |
| 8 mo | 464 | 58 | 270 d (8 + 1 free) | 1 | no | Top, giftbag, 1 recovery voucher, 1 Fitness Engine, 1 month free |
| 12 mo | 672 | 56 | 420 d (12 + 2 free) | 2 | no | Top, giftbag, 2 recovery vouchers, 2 Fitness Engine, 2 months free |

**Energise PRO memberships** — `tier='pro'`, `variant=null`. `allowed_class_types`: `prime, energise_east, energise_west`.

| term | price (total) | per mth | validity | fe_credits | cashback | perks |
|---|---|---|---|---|---|---|
| 1 mo | 90 | 90 | 30 d | 0 | yes | 10% Atlas Whey, 1 free class |
| 4 mo | 360 | 90 | 120 d | 0 | no | Top, giftbag |
| 8 mo | 632 | 79 | 270 d | 1 | no | Top, giftbag, 1 recovery voucher, 1 Fitness Engine, 1 month free |
| 12 mo | 900 | 75 | 420 d | 2 | no | Top, giftbag, 2 recovery vouchers, 2 Fitness Engine, 2 months free |

**Credit packs and drop-in**

| name | kind | credits | price | validity | allowed | cashback |
|---|---|---|---|---|---|---|
| Energise X | credits | 10 | 180 | 90 d | energise_east, energise_west | yes |
| Energise + (Drop-in) | dropin | 1 | 20 | 1 d | energise_east, energise_west | no |

Totals for multi-month terms are per-month × months as shown on the poster (65×4, 58×8, 56×12, etc). Confirm whether these are paid upfront or monthly. "1 free class" and "recovery voucher" are display-only perks in the test.

### Members (fake — 12)
Use plausible Singaporean names across communities. Suggested: Aisyah Rahman, Nur Hidayah, Faizal Hamid, Irfan Yusof, Siti Zulaikha, Marcus Tan, Wei Lin Ng, Priya Nair, Daniel Lim, Hafizah Osman, Ryan Sufian, Amirah Zainal.

**Demo member:** Aisyah Rahman — East. Holds **Energise Weekday 4-month** (paid, started 1 Jun, expires 28 Sep) **and** an **Energise X** pack with 6 of 10 credits left (expires 15 Nov) that she uses for weekend sessions. Booked into Thu 10 Sep 8pm (membership). Attended 14 sessions this year. Results in PA.ROX Jul 2025 (48:12), Apr 2026 (44:37), Kampung Grind Aug 2026 (41:05). Assigned coach: none (toggle on for the PT demo).

**Second demo member:** Marcus Tan — Energise PRO 1-month (paid, expires 30 Sep), booked into PRIME Mon 14 Sep. Shows the PRO tier and cashback badge.

**Third demo member:** Priya Nair — no active package (expired Energise 1-month on 31 Aug). Shows the "No active package" blocked state.

**Demo coach:** Faizal Hamid — coaches Energise East.
**Demo admin:** admin@stackform.test.

### Results (fake, for 3 past events)
10–15 rows per event, mix of matched (seeded members) and unmatched guests. Aisyah's times improving edition to edition. Divisions: open, doubles, family.

### Announcements
1. "September bookings are open" — all — published 31 Aug
2. "Friends & Family Morning — 19 Sept" — all — published 4 Sep
3. "East: Thursday venue reminder" — east — published 8 Sep

---

## 12. Claude Code — session plan

Put `CLAUDE.md` (separate file) in the repo root before session 1. Run each session as a fresh conversation. Commit after each.

### Session 1 — Foundation (strongest model)
> Read CLAUDE.md. Set up a Next.js 15 App Router project with TypeScript, Tailwind, and Supabase (`@supabase/ssr`). Create the schema in `supabase/migrations/0001_init.sql` exactly as specified in the brief, with RLS policies per section 6. Add email OTP auth with a `/login` page and a middleware that protects `/app/*` and `/admin/*` by role. Create `supabase/seed.sql` implementing section 11 in full, including the September session generation and fake results. Add the PWA manifest and service worker. Build the shell: member layout with bottom tabs, admin layout with sidebar. No feature screens yet — placeholder pages only. Run the migration and seed against the linked Supabase project and confirm login works as the demo member, coach, and admin.

### Session 2 — Home + Book (Sonnet)
> Read CLAUDE.md. Build the member Home and Book screens per brief section 8, against seeded data. Implement `lib/rules/entitlement.ts` (section 7 resolution order: membership → FE credit → credit → blocked) as a pure function with unit tests, then server actions `bookSession`, `cancelBooking`, `joinWaitlist` that use it. Home shows membership card and/or credits card per section 8. Use the brand direction in section 10. Test as Aisyah: book a weekday session (included), book a weekend session (1 credit), cancel it, verify the credit returns. Test as Priya: booking is blocked.

### Session 3 — Events + My PA.ROX (Sonnet)
> Read CLAUDE.md. Build Events list/detail with slot picker and registration (member and guest paths), and the past-event leaderboard. Build My PA.ROX with streak, sessions-this-month, PB card, history with deltas, and station splits view. Empty states included. Test as Aisyah: register for PA.ROX 12 Sep, view Apr 2026 results.

### Session 4 — Profile + QR check-in + polish (Sonnet)
> Read CLAUDE.md. Build Profile. Implement QR check-in: rotating `qr_secret` on sessions (60s TTL), `/app/checkin?s=&t=` route that validates and marks attended, camera scan on Home's next-session card. Then a polish pass: loading states, error toasts, empty states, mobile safe areas, install prompt. Lighthouse PWA check passes.

### Session 5 — Admin portal (Sonnet)
> Read CLAUDE.md. Build the admin portal per section 9: dashboard, schedule with bulk-create, session roster with QR display and manual attendance, members with package assignment / payment recording / credit adjustment / coach assignment, packages CRUD, events with slots, registrations export, and results CSV import with match preview, announcements. Coach role sees only today's sessions and rosters for sessions they coach. Test the full demo script in section 13.

### Session 6 — Demo prep (Sonnet, short)
> Read CLAUDE.md. Reset and re-run seed. Fix anything broken in the demo script. Deploy to Vercel production. Confirm PWA installs on Android and iOS Safari.

---

## 13. Demo script (10 minutes)

1. **Open app on phone as Aisyah.** Home: next session Thursday 8pm, "Energise Weekday · expires 28 Sep" card, "6 credits" card under it, "September bookings are open" announcement. *"This replaces the Telegram channel, the pinned pricing image, and the bot."*
2. **Book tab.** Filter East. Tap Tue 15 Sep 8pm → "Book — included". Then tap Sat 19 Sep 7.30am → "Book (1 credit)". Credits drop to 5. Cancel it. Credits return. *"Membership for the week, credits for the weekend — the app works it out."* Show a full session with waitlist. Optionally switch to Priya to show the blocked state.
3. **Events tab.** PA.ROX 12 Sep — pick Wave 2, register. *"Anyone with the link can do this. No Telegram. No Calendly."* Show Friends & Family as a free public event.
4. **My PA.ROX.** Three editions, PB 41:05, improving. Station splits. *"Nobody else in this scene gives their members this."*
5. **Switch to laptop, admin.** Dashboard. Open Thursday's roster — Aisyah's there. Show the check-in QR. Scan from phone → attended ✓.
6. **Members → Aisyah.** Assign Energise PRO 1-month, record payment, assign coach. Back on phone: membership card now shows PRO, PRIME sessions unlock in Book, My Coach card appears.
7. **Events → PA.ROX 12 Sep → Import results.** Upload CSV, preview matches, confirm. Phone: My PA.ROX now shows a fourth edition.
8. **Announcements.** Publish "PA.ROX results are up" to All. Phone Home updates.
9. Close: *"Everything you saw is one database. Every person who ever did a Kampung Grind is a row you own."*

---

## 14. Open questions for the client

1. Pricing is known (28 Aug post). Confirm: (a) Weekday / Weekend / West are separate memberships a member picks one of; (b) PRO = PRIME and includes bootcamp; (c) multi-month terms paid upfront or monthly; (d) what the cashback system actually does; (e) whether Fitness Engine is bookable with Energise X credits
2. West bootcamp venue, PRIME gym location
3. PA.ROX entry fee and whether PA co-funds
4. Who owns the Telegram bot and does it hold any data worth migrating
5. Do they want guests to register without an account, or force sign-up
6. Kampung Grind November date
7. Logo files, brand fonts if any
8. Business entity and who signs
