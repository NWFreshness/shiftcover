'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import { apiFetch, getToken, getEmployeeId } from '@/lib/auth';

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  assignedEmployeeId: string | null;
}
interface Employee {
  id: string;
  name: string;
}
interface Swap {
  id: string;
  status: string;
  shift: Shift;
  requester: { id: string; name: string };
  targetEmployee: { id: string; name: string };
}

export default function SwapsPage() {
  const router = useRouter();
  const me = getEmployeeId();
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [shiftId, setShiftId] = useState('');
  const [targetId, setTargetId] = useState('');

  const load = useCallback(async () => {
    const [shiftsRes, empRes, swapRes] = await Promise.all([
      apiFetch('/api/shifts'),
      apiFetch('/api/employees'),
      apiFetch('/api/swaps'),
    ]);
    if (shiftsRes.ok) {
      const all: Shift[] = (await shiftsRes.json()).shifts || [];
      setMyShifts(all.filter((s) => s.assignedEmployeeId === me));
    }
    if (empRes.ok)
      setEmployees(((await empRes.json()).employees || []).filter((e: Employee) => e.id !== me));
    if (swapRes.ok) setSwaps((await swapRes.json()).swaps || []);
  }, [me]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    load();
  }, [router, load]);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftId || !targetId) return;
    const res = await apiFetch('/api/swaps', {
      method: 'POST',
      body: JSON.stringify({ shiftId, targetEmployeeId: targetId }),
    });
    if (res.ok) {
      setShiftId('');
      setTargetId('');
      load();
    }
  };

  const act = async (id: string, action: 'accept' | 'reject') => {
    const res = await apiFetch(`/api/swaps/${id}/${action}`, { method: 'PUT' });
    if (res.ok) load();
  };

  const incoming = swaps.filter((s) => s.targetEmployee.id === me && s.status === 'pending');
  const outgoing = swaps.filter((s) => s.requester.id === me);

  return (
    <>
      <TopBar>
        <Link href="/board" className="btn btn-ghost btn-sm">
          ← Open Shifts
        </Link>
      </TopBar>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 animate-rise">
          <span className="label-stamp">Trade a shift</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Shift Swaps
          </h1>
        </div>

        <form onSubmit={request} className="card mb-8 animate-rise space-y-3 p-5">
          <h2 className="font-display font-bold text-ink">Request a swap</h2>
          <div>
            <label className="field-label">Your shift</label>
            <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} className="field">
              <option value="">Select one of your shifts…</option>
              {myShifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date} {s.startTime}-{s.endTime} ({s.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Swap with</label>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="field">
              <option value="">Choose a coworker…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={!shiftId || !targetId} className="btn btn-primary">
            Send Request
          </button>
        </form>

        <h2 className="label-stamp mb-2">Incoming requests</h2>
        <div className="card mb-8 animate-rise divide-y divide-line">
          {incoming.length === 0 ? (
            <div className="p-5 text-center text-sm text-ink-faint">Nothing waiting on you</div>
          ) : (
            incoming.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-4">
                <span className="text-sm text-ink">
                  <span className="font-semibold">{s.requester.name}</span> → you
                  <span className="block font-mono text-xs text-ink-soft">
                    {s.shift.date} {s.shift.startTime}-{s.shift.endTime}
                  </span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <button onClick={() => act(s.id, 'accept')} className="btn btn-primary btn-sm">
                    Accept
                  </button>
                  <button onClick={() => act(s.id, 'reject')} className="btn btn-ghost btn-sm">
                    Reject
                  </button>
                </span>
              </div>
            ))
          )}
        </div>

        <h2 className="label-stamp mb-2">Your requests</h2>
        <div className="card animate-rise divide-y divide-line">
          {outgoing.length === 0 ? (
            <div className="p-5 text-center text-sm text-ink-faint">No requests sent yet</div>
          ) : (
            outgoing.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-4">
                <span className="text-sm text-ink">
                  <span className="font-mono text-xs text-ink-soft">
                    {s.shift.date} {s.shift.startTime}-{s.shift.endTime}
                  </span>
                  <span className="block">→ {s.targetEmployee.name}</span>
                </span>
                <span className={`chip ${statusChip(s.status)}`}>{s.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function statusChip(status: string) {
  return (
    {
      pending: 'chip-open',
      accepted: 'chip-info',
      approved: 'chip-filled',
      rejected: 'chip-danger',
    }[status] || 'chip-neutral'
  );
}
