'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OpenShiftCard from '@/components/OpenShiftCard';
import { apiFetch, getToken } from '@/lib/auth';

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

export default function EmployeeBoard() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiFetch('/api/shifts')
      .then((res) => res.json())
      .then((data) => {
        const openShifts = (data.shifts || []).filter((s: Shift) => s.status === 'open');
        setShifts(openShifts);
      });
  }, [router]);

  const handleClaim = async (shiftId: string) => {
    setClaiming(shiftId);
    try {
      const res = await apiFetch('/api/claims', {
        method: 'POST',
        body: JSON.stringify({ shiftId }),
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Open Shifts</h1>
        <div className="flex gap-4">
          <Link href="/swaps" className="text-sm text-indigo-600 hover:underline">
            Swaps
          </Link>
          <Link href="/availability" className="text-sm text-indigo-600 hover:underline">
            My Availability
          </Link>
        </div>
      </div>

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
