'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OpenShiftCard from '@/components/OpenShiftCard';
import TopBar from '@/components/TopBar';
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
    <>
      <TopBar>
        <Link href="/shifts" className="btn btn-ghost btn-sm">
          My Shifts
        </Link>
        <Link href="/swaps" className="btn btn-ghost btn-sm">
          Swaps
        </Link>
        <Link href="/availability" className="btn btn-ghost btn-sm">
          Availability
        </Link>
      </TopBar>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 animate-rise">
          <span className="label-stamp">Pick up a shift</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Open Shifts
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {shifts.length > 0
              ? `${shifts.length} shift${shifts.length === 1 ? '' : 's'} up for grabs — first come, first served.`
              : 'Check back soon for shifts to claim.'}
          </p>
        </div>

        {message && (
          <div
            className={`mb-4 animate-rise ${
              message.type === 'success' ? 'banner banner-success' : 'banner banner-error'
            }`}
            role="status"
          >
            {message.text}
          </div>
        )}

        {shifts.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center animate-rise">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunk text-ink-faint">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="font-display text-lg font-bold text-ink">No open shifts</p>
            <p className="max-w-xs text-sm text-ink-soft">
              You&apos;re all caught up. New open shifts will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shifts.map((shift, i) => (
              <div
                key={shift.id}
                className="animate-rise"
                style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
              >
                <OpenShiftCard
                  shift={shift}
                  onClaim={handleClaim}
                  claiming={claiming === shift.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
