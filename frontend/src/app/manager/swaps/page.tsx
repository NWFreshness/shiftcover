'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

  const badge = (status: string) =>
    ({
      pending: 'bg-amber-100 text-amber-800',
      accepted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    })[status] || 'bg-gray-100 text-gray-700';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Swap Requests</h1>
        <Link href="/manager" className="text-sm text-indigo-600 hover:underline">
          ← Back
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
        {swaps.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No swap requests</div>
        ) : (
          swaps.map((s) => (
            <div key={s.id} className="p-3 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-900">
                <div>
                  {s.shift.date} {s.shift.startTime}-{s.shift.endTime} ({s.shift.role})
                </div>
                <div className="text-xs text-gray-500">
                  {s.requester.name} → {s.targetEmployee.name}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded ${badge(s.status)}`}>
                  {s.status}
                </span>
                {s.status === 'accepted' && (
                  <button
                    onClick={() => act(s.id, 'approve')}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                )}
                {(s.status === 'pending' || s.status === 'accepted') && (
                  <button
                    onClick={() => act(s.id, 'reject')}
                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
