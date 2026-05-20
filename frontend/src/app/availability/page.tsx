'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
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
    <>
      <TopBar>
        <Link href="/board" className="btn btn-ghost btn-sm">
          ← Open Shifts
        </Link>
      </TopBar>

      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-6 animate-rise">
          <span className="label-stamp">Let your manager know</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            My Availability
          </h1>
        </div>

        <div className="card mb-8 animate-rise p-5">
          <label className="field-label">Pick a date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              onClick={() => setAvailability(date, true)}
              disabled={saving || !date}
              className="btn btn-primary"
            >
              Available
            </button>
            <button
              onClick={() => setAvailability(date, false)}
              disabled={saving || !date}
              className="btn btn-danger"
            >
              Unavailable
            </button>
          </div>
        </div>

        <h2 className="label-stamp mb-2">Your dates</h2>
        <div className="card animate-rise divide-y divide-line">
          {records.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-faint">No availability set</div>
          ) : (
            records.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4">
                <span className="font-mono text-sm text-ink">{r.date}</span>
                <span className={`chip ${r.available ? 'chip-filled' : 'chip-danger'}`}>
                  {r.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
