/**
 * Sign-in code length. Supabase's email OTP length is a project setting
 * (Authentication, Sign In / Providers, Email), so the app accepts any length
 * inside this range rather than hardcoding one. Changing the setting must not
 * break sign-in.
 */
export const OTP_MIN = 6;
export const OTP_MAX = 10;

export function isOtpCode(value: string): boolean {
  return new RegExp(`^\\d{${OTP_MIN},${OTP_MAX}}$`).test(value);
}
