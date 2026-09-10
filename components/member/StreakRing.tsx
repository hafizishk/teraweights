/**
 * Streak ring. The number is the week streak (brief section 7); the ring fills
 * with this week's attended sessions against a modest weekly target, so it
 * moves every time the member trains rather than once a week.
 */
export function StreakRing({
  streakWeeks,
  sessionsThisWeek,
  weeklyTarget = 3,
  size = 76,
}: {
  streakWeeks: number;
  sessionsThisWeek: number;
  weeklyTarget?: number;
  size?: number;
}) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = Math.min(1, sessionsThisWeek / weeklyTarget);
  const label = `${streakWeeks}-week streak, ${sessionsThisWeek} of ${weeklyTarget} sessions this week`;

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(244,241,236,0.18)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#f4f1ec"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <span
          className="display absolute inset-0 flex items-center justify-center leading-none"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {streakWeeks}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="display text-lg leading-none tracking-wide">Week streak</span>
        <span className="text-xs text-paper/80">
          {sessionsThisWeek} of {weeklyTarget} this week
        </span>
      </div>
    </div>
  );
}
