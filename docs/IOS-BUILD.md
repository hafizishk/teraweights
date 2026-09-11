# Building the iOS app (.ipa)

The member app is a server-rendered Next.js site on Vercel. The iOS app is a native shell (Capacitor) that opens that site full-screen in a WKWebView, with the app icon, splash and name. Nothing is bundled offline; the phone must be online, same as the PWA.

## What you need before you start

| Need | Why | Cost |
|---|---|---|
| The app deployed on Vercel at a stable URL | The shell loads it. Localhost will not work on a phone. | Free tier is fine |
| Your Apple Developer account | Signing, TestFlight. Transfer the app to Teraweights' own account later from App Store Connect if they want it. | Already have it |
| A Mac with Xcode 16+, or a cloud Mac (Codemagic, GitHub Actions macOS runner) | Xcode only runs on macOS. Windows cannot produce an IPA. | Free to about US$0.10 a minute |

## Step 1. Deploy to Vercel

1. Go to https://vercel.com/new, import `hafizishk/teraweights`, branch `claude/new-session-6k3aes` (or main once merged).
2. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Do not set `DEV_LOGIN_ENABLED`.
3. Deploy. Note the URL, e.g. `https://teraweights.vercel.app`.
4. In Supabase, Authentication, URL Configuration: add that URL to Site URL and Redirect URLs, or the email code sign-in will bounce.
5. Open the URL on your phone in Safari and sign in once. If that works, the shell will work.

## Step 2. Generate the Xcode project (on the Mac)

```bash
git clone https://github.com/hafizishk/teraweights.git
cd teraweights
git checkout claude/new-session-6k3aes
npm install
APP_URL=https://teraweights.vercel.app npx cap add ios
APP_URL=https://teraweights.vercel.app npx cap sync ios
```

`APP_URL` is the Vercel URL from step 1. This creates an `ios/` folder. Commit it.

## Step 3. Icon and splash

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --ios --iconBackgroundColor '#0b0b0b' --splashBackgroundColor '#0b0b0b'
```

It reads `public/icons/icon-512.png`. For a nicer splash, put a 2732x2732 PNG at `assets/splash.png` first. Once the client sends the real logo, regenerate.

## Step 4. Open in Xcode and sign

```bash
npx cap open ios
```

1. In the left panel click **App** (the blue project icon), then the **App** target, then **Signing & Capabilities**.
2. Tick **Automatically manage signing**. Pick the Team (the Apple Developer account from above).
3. Bundle Identifier is `sg.teraweights.app` from `capacitor.config.ts`. Change it there, not in Xcode, if the client wants something else, then re-run `npx cap sync ios`.
4. In **General**, set Display Name `Teraweights`, Version `0.1.0`, Build `1`.

## Step 5. Run on your own iPhone (quick check)

1. Plug in the iPhone. On the phone, Settings, Privacy & Security, Developer Mode, on.
2. In Xcode's top bar pick your iPhone as the destination, press the Play button.
3. First time: on the phone, Settings, General, VPN & Device Management, trust the developer certificate.

The app opens straight onto the sign-in screen. Sign in as Aisyah by email code.

## Step 6. Make the .ipa

For the client to install without a cable, use TestFlight. It needs the app in App Store Connect but nothing is published.

1. https://appstoreconnect.apple.com, My Apps, plus, New App. Platform iOS, name Teraweights, bundle ID `sg.teraweights.app`, SKU `teraweights`.
2. In Xcode: top bar destination **Any iOS Device (arm64)**. Menu **Product, Archive**. Wait.
3. The Organizer window opens. Select the archive, **Distribute App**, **TestFlight & App Store**, **Upload**. Keep every default. Upload.
4. Ten to thirty minutes later it shows in App Store Connect under TestFlight. Add the client's Apple ID as an **Internal Tester** (up to 100, no review needed). They get an email, install the TestFlight app, tap Install.

To hand over a raw `.ipa` file instead (for an MDM or a sideloading tool): in step 3 choose **Custom**, then **Ad Hoc** or **Development**, then **Export**. Ad Hoc only installs on iPhones whose UDIDs you added under Certificates, Identifiers & Profiles, Devices. TestFlight is easier for a demo.

## Step 7. Each new build

```bash
git pull
APP_URL=https://teraweights.vercel.app npx cap sync ios
```

Only needed when the shell changes (icon, name, config). App code changes go live on Vercel and the shell picks them up on next open, no new IPA.

Bump **Build** by one in Xcode before every Archive, or App Store Connect rejects the upload.

## No Mac at all

Codemagic (https://codemagic.io) builds Capacitor iOS apps in the cloud and uploads to TestFlight. Free tier is 500 build minutes a month.

1. Sign up with GitHub, add the `teraweights` repo.
2. Team settings, Integrations, App Store Connect: add an API key (App Store Connect, Users and Access, Integrations, Team Keys, generate, download the `.p8`).
3. Codemagic, Code signing identities, iOS: **Fetch from App Store Connect** using that key. It creates the certificate and profile for you.
4. Add a `codemagic.yaml` at the repo root (Codemagic's Capacitor template, workflow `ios-workflow`, with `npm ci`, `npx cap add ios`, `npx cap sync ios`, `xcode-project use-profiles`, `xcode-project build-ipa`, publish to TestFlight). Start a build.

Twenty minutes of setup, then every build is one click and lands in TestFlight.

## App Store later

Apple reviews web wrappers strictly (guideline 4.2, minimum functionality). TestFlight for members and the PWA for everyone else is fine for the demo and the first months. For a public App Store listing, add native pieces first: push notifications, the camera check-in through the native scanner, and offline caching of the schedule.
