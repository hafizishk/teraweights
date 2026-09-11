# Demo walk, current build

Brief section 13, mapped to the screens as built. Reseed first (`npm run db:reset`, or paste `supabase/seed.sql` into the SQL editor). Sign in through `/dev/login` locally, or by email code on the deployed build.

Tabs on the phone: **Book · Packs · You · Feed · Events**. You is the raised circle in the middle and the landing screen. The avatar top right opens Account.

| Step | Brief says | Where it is now |
|---|---|---|
| 1 | Home as Aisyah: next session Thu 8pm, membership card, credits, announcement | **You** tab (lands here). Hero: Thursday 8:00pm, Bedok Reservoir, Faizal. Header word reads "Weekday". Latest post card mid-screen. Packages at the bottom: Energise Weekday 4-month until 28 Sep, Energise X 6 credits. |
| 2 | Book tab, membership vs credits, waitlist, Priya blocked | **Book**. Same. As Priya the sheet reads "No active package. See packs →" and offers the free week. |
| 3 | Events, PA.ROX 12 Sep, register into Wave 2 | **Events**. Same. |
| 4 | My PA.ROX: three editions, PB, splits | **You** → the My PA.ROX card ("Personal best 41:05"). |
| 5 | Admin dashboard, Thursday roster, QR, scan → attended | **/admin** → Schedule → Thursday. QR button on the session. Phone: hero shows Check in inside 30 minutes of start; scan at /app/checkin/scan. |
| 6 | Assign PRO, record payment, assign coach | **/admin/members** → Aisyah. Phone: header word becomes "PRO", PRIME sessions open in Book, the Personal training row on You reads "Coach: Faizal Hamid". |
| 7 | Import PA.ROX results CSV | **/admin/events** → PA.ROX 12 Sep → Import results. Phone: My PA.ROX card and page show the fourth edition. |
| 8 | Publish an announcement, phone Home updates | **/admin/announcements** (titled Community). Phone: post card on You and the Feed tab. |

## Extra beats worth showing

- **Packs** as Priya: free week card at the top, then every plan with the term switch. As Aisyah: her plan lifted with "For you" because the membership ends inside 14 days.
- **Personal training** as Marcus: 5 sessions left, next PT Tue 15 Sep 7:00am with Faizal, the coach's notes from past sessions. Book a slot into Faizal's open hours and it confirms instantly.
- **Coaches** from You: Faizal's page, then a session deep-links into Book.
- **Staff** in admin: invite an event assistant by email; they see registrations only.

## Not in this build

Payments (Buy buttons say "Checkout is coming"), push notifications, comments. Trial week is a plain free week with no card.
