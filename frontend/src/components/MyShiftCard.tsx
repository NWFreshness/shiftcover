interface MyShiftCardProps {
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    role: string;
    site: string | null;
  };
}

export default function MyShiftCard({ shift }: MyShiftCardProps) {
  const date = new Date(shift.date);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="card relative flex flex-col overflow-hidden">
      <span className="absolute left-0 top-0 h-full w-1 bg-sage" />
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <span className="chip chip-filled mb-2">Scheduled</span>
          <div className="font-display text-lg font-bold leading-tight text-ink">{shift.role}</div>
          {shift.site && <div className="mt-0.5 text-sm text-ink-soft">{shift.site}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-base font-bold text-pine">{weekday}</div>
          <div className="font-mono text-xs text-ink-soft">{monthDay}</div>
        </div>
      </div>
      <div className="flex items-center border-t border-line bg-surface-sunk px-4 py-3">
        <span className="font-mono text-sm tabular-nums text-ink">
          {shift.startTime}–{shift.endTime}
        </span>
      </div>
    </div>
  );
}
