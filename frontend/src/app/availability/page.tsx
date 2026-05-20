'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getToken } from '@/lib/auth';

interface Availability {
  id: string;
  date: string;
  available: boolean;
}

export default function AvailabilityPage() {
  const router = useRouter();
  const [records, setRecords] = useState<Availability[]>([]);
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch('/api/availability/mine');
    if (res.ok) setRecords((await res.json()).availability || []);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    load();
  }, [router, load]);

  const setAvailability = async (forDate: string, available: boolean) => {
    if (!forDate) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/availability', {
        method: 'PUT',
        body: JSON.stringify({ date: forDate, available }),
      });
      if (res.ok) {
        setDate('');
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Availability</h1>
        <Link href="/board" className="text-sm text-indigo-600 hover:underline">
          ← Open Shifts
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-end gap-3">
        <label className="flex-1">
          <span className="text-sm font-medium text-gray-700">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <button
          onClick={() => setAvailability(date, false)}
          disabled={saving || !date}
          className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          Mark Unavailable
        </button>
        <button
          onClick={() => setAvailability(date, true)}
          disabled={saving || !date}
          className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          Mark Available
        </button>
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
        {records.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No availability set</div>
        ) : (
          records.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <span className="text-sm text-gray-900">{r.date}</span>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  r.available
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {r.available ? 'Available' : 'Unavailable'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
