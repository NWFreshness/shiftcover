'use client';

import { useState, useEffect } from 'react';

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

interface ScheduleGridProps {
  businessId: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am to 6pm

export default function ScheduleGrid({ businessId }: ScheduleGridProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/shifts/${businessId}`)
      .then((res) => res.json())
      .then((data) => {
        setShifts(data.shifts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [businessId]);

  // Get week starting from Sunday
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const weekDays = DAYS.map((day, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      name: day,
      date: date.toISOString().split('T')[0],
    };
  });

  const getShiftsForDay = (date: string) =>
    shifts.filter((s) => s.date === date);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading schedule...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
        <div className="p-2 text-center text-sm font-medium text-gray-500">Time</div>
        {weekDays.map((day) => (
          <div key={day.date} className="p-2 text-center text-sm font-medium text-gray-900">
            <div>{day.name}</div>
            <div className="text-xs text-gray-500">{day.date.slice(5)}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="divide-y divide-gray-100">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 min-h-[60px]">
            <div className="p-2 text-xs text-gray-500 text-right pr-4">
              {hour > 12 ? `${hour - 12}PM` : hour === 12 ? '12PM' : `${hour}AM`}
            </div>
            {weekDays.map((day) => {
              const dayShifts = getShiftsForDay(day.date).filter((s) => {
                const shiftHour = parseInt(s.startTime.split(':')[0]);
                return shiftHour === hour;
              });
              return (
                <div key={`${day.date}-${hour}`} className="border-l border-gray-100 p-1">
                  {dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={`text-xs p-1 rounded mb-1 ${
                        shift.status === 'filled'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <div className="font-medium">{shift.role}</div>
                      <div className="text-[10px] opacity-75">
                        {shift.startTime}-{shift.endTime}
                      </div>
                      {shift.assignedEmployee && (
                        <div className="text-[10px] font-medium mt-1">
                          {shift.assignedEmployee.name}
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