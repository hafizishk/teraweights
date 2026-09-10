/**
 * The dev account switcher (/dev/login) signs in as any seeded account without
 * an email. It exists because the demo inbox's plus-aliases cannot receive mail
 * until Teraweights has a sending domain. Off unless explicitly enabled, and
 * never in a production build.
 */
export function devLoginEnabled(): boolean {
  return process.env.DEV_LOGIN_ENABLED === "true" && process.env.NODE_ENV !== "production";
}
