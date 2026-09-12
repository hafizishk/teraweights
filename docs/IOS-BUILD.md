# Building the iOS app (.ipa) and shipping to TestFlight

No Mac needed. Codemagic builds it in the cloud and uploads to TestFlight. The
config is `codemagic.yaml` at the repo root; it generates the Xcode project
from `capacitor.config.ts` on every run, so `ios/` is never committed.

The app itself is the deployed Next.js site on Vercel, wrapped in a native
WKWebView shell. Nothing is bundled offline, so the phone must be online, same
as the PWA. App code changes ship through Vercel and the installed app picks
them up on next open. You only need a new build when the icon, name, bundle ID
or the URL changes.

## One-time setup

Three things, all in a browser. Roughly 15 minutes, once.

### 1. Create the app record (appstoreconnect.apple.com)

1. https://appstoreconnect.apple.com, **My Apps**, **+**, **New App**.
2. Platform iOS. Name `Teraweights`. Primary language English (U.K.).
3. Bundle ID: type or pick `sg.teraweights.app`. SKU `teraweights`. Full access.
4. **Create**.

The bundle ID does not need registering at developer.apple.com first. The
build registers it, creates the distribution certificate and creates the App
Store provisioning profile on its first run, through the App Store Connect API
key below. That key therefore needs **App Manager** access, not Developer.

### 2. App Store Connect API key

1. App Store Connect, **Users and Access**, **Integrations**, **App Store Connect API**, **Team Keys**.
2. **+**, name `Codemagic`, access **App Manager**. **Generate**.
3. Download the `.p8`. It downloads once only.
4. Copy the **Issuer ID** from the top of the page and the **Key ID** from the row.

### 3. Connect Codemagic (codemagic.io)

1. https://codemagic.io. Scroll to **For individuals** at the bottom of the pricing page and click **Get started** there. It is free: 500 macOS minutes a month, unlimited apps, one build at a time. A build here is 10 to 15 minutes, so that is 30-odd builds a month. Sign up with GitHub and allow access to `teraweights`.
2. **Personal Account** (or **Teams** on a paid plan), **Integrations**, **App Store Connect**, **Connect**.
3. Name it exactly `teraweights`, to match `integrations` in `codemagic.yaml`.
4. Paste the Issuer ID and Key ID, upload the `.p8`. Save.
5. **Applications**, **Add application**, pick `hafizishk/teraweights`, choose the **codemagic.yaml** configuration source.

## Every build

1. Codemagic, the Teraweights app, **Start new build**.
2. Branch: `claude/new-session-6k3aes` (or `main` once merged). Workflow: **iOS TestFlight**.
3. **Start build**. Roughly 10 to 15 minutes.
4. It lands in TestFlight. Add testers in App Store Connect, TestFlight tab, Internal Testing; they install the TestFlight app and tap Install.

The `.ipa` is also downloadable from the build's Artifacts panel if you need the
raw file.

The individual plan is single-user. Adding the client or a teammate to the
Codemagic account itself needs a paid plan; they do not need one to install
from TestFlight.

Build numbers come from Codemagic's own counter, so they always increase and
App Store Connect never rejects an upload for a duplicate. The version string
comes from `package.json`.

## If a build fails on signing

`No matching profiles found for bundle identifier ... and distribution type
"app_store"` means the signing assets do not exist at Apple yet and something
stopped the build creating them. Check, in order:

1. The API key has **App Manager** access. Developer access cannot create certificates.
2. Your team has fewer than three iOS Distribution certificates. Apple caps it at three; revoke an unused one at developer.apple.com, Certificates.
3. The app record exists in App Store Connect with bundle ID `sg.teraweights.app`.

As a last resort, register the ID by hand: developer.apple.com, Certificates
Identifiers & Profiles, Identifiers, **+**, App IDs, App, Explicit,
`sg.teraweights.app`, Register. Then re-run the build.

## Changing things

- **The URL the app loads**: `APP_URL` in `codemagic.yaml`, and the default in `capacitor.config.ts`.
- **Bundle ID**: `capacitor.config.ts`, then `BUNDLE_ID` and `ios_signing.bundle_identifier` in `codemagic.yaml`, and register the new ID with Apple.
- **Icon and splash**: `assets/icon.png` (1024) and `assets/splash.png` (2732) are committed and used automatically. Regenerate them from `scripts/icons/*.html` with `npm run icons` when the client sends the real logo.

## If you do have a Mac

```bash
npm install
npx cap add ios
npx cap sync ios
npx cap open ios
```

Open `ios/App/App.xcodeproj`. Capacitor 8 uses Swift Package Manager, so there
is no `.xcworkspace`. Then in Xcode: **App** target, **Signing &
Capabilities**, automatic signing, pick your team, connect an iPhone and press
Play. Requires the full Xcode app from the Mac App Store, not just the command
line tools.

## App Store later

Apple reviews web wrappers strictly under guideline 4.2, minimum
functionality. TestFlight for members and the PWA for everyone else is fine for
the demo and the first months. For a public listing, add native pieces first:
push notifications, camera check-in through the native scanner, and offline
caching of the schedule.
