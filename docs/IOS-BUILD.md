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

The bundle ID does not need registering at developer.apple.com first.
Codemagic's automatic signing creates it through the App Store Connect API.

### 2. App Store Connect API key

1. App Store Connect, **Users and Access**, **Integrations**, **App Store Connect API**, **Team Keys**.
2. **+**, name `Codemagic`, access **App Manager**. **Generate**.
3. Download the `.p8`. It downloads once only.
4. Copy the **Issuer ID** from the top of the page and the **Key ID** from the row.

### 3. Connect Codemagic (codemagic.io)

1. https://codemagic.io, sign up with GitHub, allow access to `teraweights`.
2. **Teams**, your team, **Integrations**, **App Store Connect**, **Connect**.
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

Build numbers come from Codemagic's own counter, so they always increase and
App Store Connect never rejects an upload for a duplicate. The version string
comes from `package.json`.

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

Then in Xcode: **App** target, **Signing & Capabilities**, automatic signing,
pick your team, connect an iPhone and press Play. Requires the full Xcode app
from the Mac App Store, not just the command line tools.

## App Store later

Apple reviews web wrappers strictly under guideline 4.2, minimum
functionality. TestFlight for members and the PWA for everyone else is fine for
the demo and the first months. For a public listing, add native pieces first:
push notifications, camera check-in through the native scanner, and offline
caching of the schedule.
