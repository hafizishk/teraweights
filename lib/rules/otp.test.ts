import { describe, expect, it } from "vitest";
import { isOtpCode, OTP_MAX, OTP_MIN } from "./otp";

describe("isOtpCode", () => {
  it("accepts every length Supabase can be configured to send", () => {
    for (let n = OTP_MIN; n <= OTP_MAX; n++) {
      expect(isOtpCode("1".repeat(n))).toBe(true);
    }
  });

  it("rejects short, long and non-numeric input", () => {
    expect(isOtpCode("12345")).toBe(false);
    expect(isOtpCode("1".repeat(OTP_MAX + 1))).toBe(false);
    expect(isOtpCode("12345a")).toBe(false);
    expect(isOtpCode("")).toBe(false);
    expect(isOtpCode("123 456")).toBe(false);
  });
});
