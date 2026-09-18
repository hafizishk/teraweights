# Demo walk, current build

Brief section 13, mapped to the screens as built. Reseed first (`npm run db:reset`, or paste `supabase/seed.sql` into the SQL editor). Sign in through `/dev/login` locally, or by email code on the deployed build. Reseeding recreates the demo accounts, so everyone signs in again and Aisyah's photo needs re-uploading.

Tabs on the phone: **Book · Packs · You · Feed · Events**. You is the raised circle in the middle and the landing screen. The avatar top right opens Account.

## Three profiles (agreed 18 Sep 2026)

| Member | Sign in as | State | Shows |
|---|---|---|---|
| Marcus Tan | hafizishk+marcus@gmail.com | Nothing. Never onboarded, no package, never used the free week | First sign-in onboarding, the empty state, Packs, then start the free week live |
| Priya Nair | hafizishk+priya@gmail.com | Free Trial Week, day 5 of 7 (14–21 Sep). East Tue 15 Sep attended, Sat 19 Sep booked. Old 1-month expired 31 Aug | The trial nudge counting down, Packs pushing a first pack, East and West only in Book |
| Aisyah Rahman | hafizishk+aisyah@gmail.com | Weekday 4-month ending 28 Sep, Energise X 6 credits, PT 8-pack with 3 left, coach Faizal, Apple Health through a Whoop | Renewal nudge, classes, PT with the coach's notes, heart-rate data on both, This week |

Run them in that order: before, during, after.

| Step | Brief says | Where it is now |
|---|---|---|
| 1 | Home as Aisyah: next session Thu 8pm, membership card, credits, announcement | **You** tab (lands here). Hero: Thursday 8:00pm, Bedok Reservoir, Faizal. Header word reads "Weekday". Latest post card mid-screen. Packages at the bottom: Energise Weekday 4-month until 28 Sep, Energise X 6 credits. |
| 2 | Book tab, membership vs credits, waitlist, Priya blocked | **Book**. Same. As Priya the sheet reads "No active package. See packs →" and offers the free week. |
| 3 | Events, PA.ROX 12 Sep, register into Wave 2 | **Events**. Same. |
| 4 | My PA.ROX: three editions, PB, splits | **You** → the My PA.ROX card ("Personal best 41:05"). |
| 5 | Admin dashboard, Thursday roster, QR, scan → attended | **/admin** → Schedule → Thursday. QR button on the session. Phone: hero shows Check in inside 30 minutes of start; scan at /app/checkin/scan. |
| 6 | Assign PRO, record payment, assign coach | **/admin/members** → Aisyah. Phone: header word becomes "PRO", PRIME sessions open in Book. Aisyah already has Faizal as coach; assign one to Priya instead to show the beat. |
| 7 | Import PA.ROX results CSV | **/admin/events** → PA.ROX 12 Sep → Import results. Phone: My PA.ROX card and page show the fourth edition. |
| 8 | Publish an announcement, phone Home updates | **/admin/announcements** (titled Community). Phone: post card on You and the Feed tab. |

## Extra beats worth showing

- **Packs** as Priya: free week card at the top, then every plan with the term switch. As Aisyah: her plan lifted with "For you" because the membership ends inside 14 days.
- **Personal training** as Aisyah: 3 sessions left, next PT Tue 15 Sep 7:00am with Faizal, the coach's notes and a heart-rate strip on each past session, "Your last PT" with zones. Book a slot into Faizal's open hours and it confirms instantly.
- **Connected health** as Aisyah: the Your session card on You (Tue 8 Sep, tap for the trace), This week with her Wednesday run in blue, Connected health under Account. Marcus and Priya show the not-connected state.
- **Coaches** from You: Faizal's page, then a session deep-links into Book.
- **Staff** in admin: invite an event assistant by email; they see registrations only.

## Not in this build

Payments (Buy buttons say "Checkout is coming"), push notifications, comments. Trial week is a plain free week with no card.
