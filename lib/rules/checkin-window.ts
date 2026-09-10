/**
 * Check-in timing constants, split out from lib/rules/checkin.ts so client
 * components can read them. That module uses node:crypto and must never be
 * pulled into a browser bundle; these two numbers are safe anywhere.
 */

/** The QR token changes every minute. */
export const CHECKIN_WINDOW_SECONDS = 60;

/** Check-in opens this long before the session starts. */
export const CHECKIN_OPENS_MINUTES_BEFORE = 30;
