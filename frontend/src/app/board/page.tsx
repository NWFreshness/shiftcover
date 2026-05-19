'use client';

import { useState, useEffect } from 'react';
import OpenShiftCard from '@/components/OpenShiftCard';

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  site: string | null;
  status: string;
  businessId: string;
}

const DEMO_BUSINESS_ID = 'demo';

export default function EmployeeBoard() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/shifts/${DEMO_BUSINESS_ID}`)
      .then((res) => res.json())
      .then((data) => {
        const openShifts = (data.shifts || []).filter((s: Shift) => s.status === 'open');
        setShifts(openShifts);
      });
  }, []);

  const handleClaim = async (shiftId: string) => {
    setClaiming(shiftId);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, employeeId: 'demo-employee' }),
      });
      if (res.ok) {
        setShifts(shifts.filter((s) => s.id !== shiftId));
        setMessage({ type: 'success', text: 'Shift claimed successfully!' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to claim shift' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setClaiming(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Open Shifts</h1>

      {message && (
        <div
          className={`mb-4 p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {shifts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg shadow">
            No open shifts available
          </div>
        ) : (
          shifts.map((shift) => (
            <OpenShiftCard
              key={shift.id}
              shift={shift}
              onClaim={handleClaim}
              claiming={claiming === shift.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
