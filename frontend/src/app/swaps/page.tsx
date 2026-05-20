'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    if (empRes.ok) setEmployees(((await empRes.json()).employees || []).filter((e: Employee) => e.id !== me));
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Shift Swaps</h1>
        <Link href="/board" className="text-sm text-indigo-600 hover:underline">
          ← Open Shifts
        </Link>
      </div>

      <form onSubmit={request} className="bg-white rounded-lg shadow p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Request a swap</h2>
        <select
          value={shiftId}
          onChange={(e) => setShiftId(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">Select one of your shifts…</option>
          {myShifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.date} {s.startTime}-{s.endTime} ({s.role})
            </option>
          ))}
        </select>
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">Swap with…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!shiftId || !targetId}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          Send Request
        </button>
      </form>

      <h2 className="font-semibold text-gray-900 mb-2">Incoming requests</h2>
      <div className="bg-white rounded-lg shadow divide-y divide-gray-100 mb-6">
        {incoming.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">None</div>
        ) : (
          incoming.map((s) => (
            <div key={s.id} className="p-3 flex items-center justify-between">
              <span className="text-sm text-gray-900">
                {s.requester.name} → you: {s.shift.date} {s.shift.startTime}-{s.shift.endTime}
              </span>
              <span className="flex gap-2">
                <button
                  onClick={() => act(s.id, 'accept')}
                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  Accept
                </button>
                <button
                  onClick={() => act(s.id, 'reject')}
                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      <h2 className="font-semibold text-gray-900 mb-2">Your requests</h2>
      <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
        {outgoing.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">None</div>
        ) : (
          outgoing.map((s) => (
            <div key={s.id} className="p-3 flex items-center justify-between">
              <span className="text-sm text-gray-900">
                {s.shift.date} {s.shift.startTime}-{s.shift.endTime} → {s.targetEmployee.name}
              </span>
              <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700">
                {s.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
