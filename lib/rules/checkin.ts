/**
 * QR check-in — brief section 7.
 *
 * The QR encodes /app/checkin?s=<session>&t=<token>, where the token is an
 * HMAC of the session id and a 60-second time window under the session's
 * secret. The QR therefore changes every minute without the database being
 * touched, and a photographed QR is useless a minute later. Validation accepts
 * the current and the previous window so a scan at the boundary still works.
 *
 * Server-only: uses node:crypto. The secret never reaches the browser.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { CHECKIN_OPENS_MINUTES_BEFORE, CHECKIN_WINDOW_SECONDS } from "@/lib/rules/checkin-window";

export { CHECKIN_OPENS_MINUTES_BEFORE, CHECKIN_WINDOW_SECONDS };

const TOKEN_LENGTH = 12;

export function windowIndex(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 1000 / CHECKIN_WINDOW_SECONDS);
}

export function checkinToken(secret: string, sessionId: string, window: number): string {
  return createHmac("sha256", secret).update(`${sessionId}:${window}`).digest("base64url").slice(0, TOKEN_LENGTH);
}

export function checkinPath(sessionId: string, token: string): string {
  return `/app/checkin?s=${encodeURIComponent(sessionId)}&t=${encodeURIComponent(token)}`;
}

export type CheckinState = "early" | "open" | "closed";

/** Open from 30 minutes before start until the session ends. */
export function checkinState(session: { starts_at: string; ends_at: string }, now: Date = new Date()): CheckinState {
  const opens = new Date(session.starts_at).getTime() - CHECKIN_OPENS_MINUTES_BEFORE * 60_000;
  const closes = new Date(session.ends_at).getTime();
  const t = now.getTime();
  if (t < opens) return "early";
  if (t > closes) return "closed";
  return "open";
}

export type CheckinValidation =
  | { ok: true }
  | { ok: false; reason: "early" | "closed" | "bad_token"; message: string };

export function validateCheckin(input: {
  secret: string;
  sessionId: string;
  token: string;
  startsAt: string;
  endsAt: string;
  now?: Date;
}): CheckinValidation {
  const now = input.now ?? new Date();
  const state = checkinState({ starts_at: input.startsAt, ends_at: input.endsAt }, now);
  if (state === "early") {
    return { ok: false, reason: "early", message: `Check-in opens ${CHECKIN_OPENS_MINUTES_BEFORE} minutes before the session.` };
  }
  if (state === "closed") {
    return { ok: false, reason: "closed", message: "This session has ended." };
  }

  const w = windowIndex(now);
  const candidates = [checkinToken(input.secret, input.sessionId, w), checkinToken(input.secret, input.sessionId, w - 1)];
  const given = Buffer.from(input.token);
  const match = candidates.some((c) => {
    const expected = Buffer.from(c);
    return expected.length === given.length && timingSafeEqual(expected, given);
  });

  if (!match) {
    return { ok: false, reason: "bad_token", message: "That code has expired. Scan the QR again." };
  }
  return { ok: true };
}
