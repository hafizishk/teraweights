import { describe, expect, it } from "vitest";
import { checkinState, checkinToken, validateCheckin, windowIndex } from "./checkin";

const SECRET = "3f9c2a1b7e4d8c6a5b0f1e2d3c4b5a69";
const SESSION = "a1b2c3d4-0000-4000-8000-000000000001";
// Thu 10 Sep 2026 8:00–9:00pm SGT
const STARTS = "2026-09-10T12:00:00Z";
const ENDS = "2026-09-10T13:00:00Z";

describe("checkinState", () => {
  it("opens 30 minutes before and closes at the end", () => {
    expect(checkinState({ starts_at: STARTS, ends_at: ENDS }, new Date("2026-09-10T11:29:00Z"))).toBe("early");
    expect(checkinState({ starts_at: STARTS, ends_at: ENDS }, new Date("2026-09-10T11:30:00Z"))).toBe("open");
    expect(checkinState({ starts_at: STARTS, ends_at: ENDS }, new Date("2026-09-10T12:45:00Z"))).toBe("open");
    expect(checkinState({ starts_at: STARTS, ends_at: ENDS }, new Date("2026-09-10T13:00:01Z"))).toBe("closed");
  });
});

describe("checkinToken", () => {
  it("is stable within a window and changes across windows", () => {
    const a = checkinToken(SECRET, SESSION, 100);
    expect(a).toBe(checkinToken(SECRET, SESSION, 100));
    expect(a).not.toBe(checkinToken(SECRET, SESSION, 101));
    expect(a).toHaveLength(12);
  });

  it("differs per session and per secret", () => {
    expect(checkinToken(SECRET, SESSION, 100)).not.toBe(checkinToken(SECRET, "other", 100));
    expect(checkinToken(SECRET, SESSION, 100)).not.toBe(checkinToken("other-secret", SESSION, 100));
  });
});

describe("validateCheckin", () => {
  const now = new Date("2026-09-10T11:50:00Z");
  const w = windowIndex(now);

  it("accepts the current window", () => {
    const token = checkinToken(SECRET, SESSION, w);
    expect(validateCheckin({ secret: SECRET, sessionId: SESSION, token, startsAt: STARTS, endsAt: ENDS, now })).toEqual({ ok: true });
  });

  it("accepts the previous window as grace", () => {
    const token = checkinToken(SECRET, SESSION, w - 1);
    expect(validateCheckin({ secret: SECRET, sessionId: SESSION, token, startsAt: STARTS, endsAt: ENDS, now }).ok).toBe(true);
  });

  it("rejects two windows ago", () => {
    const token = checkinToken(SECRET, SESSION, w - 2);
    const r = validateCheckin({ secret: SECRET, sessionId: SESSION, token, startsAt: STARTS, endsAt: ENDS, now });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_token");
  });

  it("rejects a token for a different session", () => {
    const token = checkinToken(SECRET, "someone-elses-session", w);
    expect(validateCheckin({ secret: SECRET, sessionId: SESSION, token, startsAt: STARTS, endsAt: ENDS, now }).ok).toBe(false);
  });

  it("rejects before the window opens, even with a valid token", () => {
    const early = new Date("2026-09-10T11:00:00Z");
    const token = checkinToken(SECRET, SESSION, windowIndex(early));
    const r = validateCheckin({ secret: SECRET, sessionId: SESSION, token, startsAt: STARTS, endsAt: ENDS, now: early });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("early");
  });

  it("rejects after the session ends", () => {
    const late = new Date("2026-09-10T13:30:00Z");
    const token = checkinToken(SECRET, SESSION, windowIndex(late));
    const r = validateCheckin({ secret: SECRET, sessionId: SESSION, token, startsAt: STARTS, endsAt: ENDS, now: late });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("closed");
  });
});
