import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iOS shell for the member app. The app is server-rendered on Vercel, so the
 * native build is a WKWebView pointed at the deployed URL, not a bundle of
 * static files. Set APP_URL when syncing: APP_URL=https://app.teraweights.sg npx cap sync ios
 */
const url = process.env.APP_URL ?? "https://teraweights.vercel.app";

const config: CapacitorConfig = {
  appId: "sg.teraweights.app",
  appName: "Teraweights",
  webDir: "public",
  server: {
    url,
    cleartext: false,
  },
  ios: {
    contentInset: "never",
    backgroundColor: "#0b0b0b",
    preferredContentMode: "mobile",
  },
};

export default config;
