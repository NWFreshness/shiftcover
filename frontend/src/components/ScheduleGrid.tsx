'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/auth';

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  site: string | null;
  status: 'open' | 'filled';
  assignedEmployee?: { id: string; name: string };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am to 6pm

function hourLabel(hour: number) {
  if (hour === 12) return '12P';
  return hour > 12 ? `${hour - 12}P` : `${hour}A`;
}

export default function ScheduleGrid() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/shifts')
      .then((res) => res.json())
      .then((data) => {
        setShifts(data.shifts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekDays = DAYS.map((day, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return { name: day, date: date.toISOString().split('T')[0] };
  });

  const getShiftsForDay = (date: string) => shifts.filter((s) => s.date === date);

  if (loading) {
    return (
      <div className="card p-10 text-center">
        <span className="label-stamp animate-pulse">Loading schedule…</span>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-b border-line bg-surface-sunk sm:grid-cols-[3.5rem_repeat(7,1fr)]">
        <div className="flex items-center justify-center py-2.5">
          <span className="label-stamp">Hr</span>
        </div>
        {weekDays.map((day) => {
          const isToday = day.date === todayIso;
          return (
            <div
              key={day.date}
              className={`border-l border-line py-2 text-center ${
                isToday ? 'bg-pine-soft' : ''
              }`}
            >
              <div
                className={`font-display text-sm font-bold ${
                  isToday ? 'text-pine' : 'text-ink'
                }`}
              >
                {day.name}
              </div>
              <div className="font-mono text-[0.65rem] text-ink-soft">{day.date.slice(5)}</div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="divide-y divide-line/60">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid min-h-[58px] grid-cols-[3rem_repeat(7,1fr)] sm:grid-cols-[3.5rem_repeat(7,1fr)]"
          >
            <div className="flex items-start justify-end pr-2 pt-1.5">
              <span className="font-mono text-[0.65rem] text-ink-faint">{hourLabel(hour)}</span>
            </div>
            {weekDays.map((day) => {
              const isToday = day.date === todayIso;
              const dayShifts = getShiftsForDay(day.date).filter(
                (s) => parseInt(s.startTime.split(':')[0]) === hour,
              );
              return (
                <div
                  key={`${day.date}-${hour}`}
                  className={`border-l border-line/70 p-1 ${isToday ? 'bg-pine-soft/35' : ''}`}
                >
                  {dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={`mb-1 rounded border p-1.5 ${
                        shift.status === 'filled'
                          ? 'border-sage/30 bg-sage-soft'
                          : 'border-marigold/30 bg-marigold-soft'
                      }`}
                    >
                      <div
                        className={`text-xs font-semibold leading-tight ${
                          shift.status === 'filled' ? 'text-sage-ink' : 'text-marigold-ink'
                        }`}
                      >
                        {shift.role}
                      </div>
                      <div className="font-mono text-[0.62rem] text-ink-soft">
                        {shift.startTime}–{shift.endTime}
                      </div>
                      {shift.assignedEmployee ? (
                        <div className="mt-0.5 truncate text-[0.66rem] font-medium text-ink">
                          {shift.assignedEmployee.name}
                        </div>
                      ) : (
                        <div className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-marigold">
                          Open
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
