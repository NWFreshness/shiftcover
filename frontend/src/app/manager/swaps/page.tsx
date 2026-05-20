'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import { apiFetch, getToken, isManager } from '@/lib/auth';

interface Swap {
  id: string;
  status: string;
  shift: { id: string; date: string; startTime: string; endTime: string; role: string };
  requester: { id: string; name: string };
  targetEmployee: { id: string; name: string };
}

export default function ManagerSwaps() {
  const router = useRouter();
  const [swaps, setSwaps] = useState<Swap[]>([]);

  const load = useCallback(async () => {
    const res = await apiFetch('/api/swaps');
    if (res.ok) setSwaps((await res.json()).swaps || []);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    if (!isManager()) {
      router.replace('/board');
      return;
    }
    load();
  }, [router, load]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    const res = await apiFetch(`/api/swaps/${id}/${action}`, { method: 'PUT' });
    if (res.ok) load();
  };

  const chip = (status: string) =>
    ({
      pending: 'chip-open',
      accepted: 'chip-info',
      approved: 'chip-filled',
      rejected: 'chip-danger',
    })[status] || 'chip-neutral';

  return (
    <>
      <TopBar>
        <Link href="/manager" className="btn btn-ghost btn-sm">
          ← Schedule
        </Link>
      </TopBar>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 animate-rise">
          <span className="label-stamp">Approvals</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Swap Requests
          </h1>
        </div>

        <div className="card animate-rise divide-y divide-line">
          {swaps.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-faint">No swap requests</div>
          ) : (
            swaps.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 text-sm text-ink">
                  <div className="font-mono text-xs text-ink-soft">
                    {s.shift.date} {s.shift.startTime}-{s.shift.endTime} · {s.shift.role}
                  </div>
                  <div className="mt-0.5">
                    <span className="font-semibold">{s.requester.name}</span> →{' '}
                    {s.targetEmployee.name}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`chip ${chip(s.status)}`}>{s.status}</span>
                  {s.status === 'accepted' && (
                    <button onClick={() => act(s.id, 'approve')} className="btn btn-primary btn-sm">
                      Approve
                    </button>
                  )}
                  {(s.status === 'pending' || s.status === 'accepted') && (
                    <button onClick={() => act(s.id, 'reject')} className="btn btn-ghost btn-sm">
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
