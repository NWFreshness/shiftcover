'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MyShiftCard from '@/components/MyShiftCard';
import TopBar from '@/components/TopBar';
import { apiFetch, getToken } from '@/lib/auth';

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  site: string | null;
}

export default function MyShiftsPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiFetch('/api/shifts/mine')
      .then((res) => res.json())
      .then((data) => {
        setShifts(data.shifts || []);
        setLoading(false);
      });
  }, [router]);

  return (
    <>
      <TopBar>
        <Link href="/board" className="btn btn-ghost btn-sm">
          Open Shifts
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
          <span className="label-stamp">Your schedule</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            My Shifts
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {!loading && shifts.length > 0
              ? `${shifts.length} upcoming shift${shifts.length === 1 ? '' : 's'}`
              : !loading
                ? 'No upcoming shifts.'
                : ''}
          </p>
        </div>

        {!loading && shifts.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center animate-rise">
            <p className="font-display text-lg font-bold text-ink">No upcoming shifts</p>
            <p className="max-w-xs text-sm text-ink-soft">
              You don&apos;t have any scheduled shifts coming up.
            </p>
            <Link href="/board" className="btn btn-primary btn-sm mt-2">
              Browse Open Shifts
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shifts.map((shift, i) => (
              <div
                key={shift.id}
                className="animate-rise"
                style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
              >
                <MyShiftCard shift={shift} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
