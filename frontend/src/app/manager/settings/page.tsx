'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getToken, isManager } from '@/lib/auth';

interface Rules {
  minRestHours: number;
  noDoubleShiftHours: number;
  maxHoursPerWeek: number;
}

export default function CoverageSettings() {
  const router = useRouter();
  const [rules, setRules] = useState<Rules>({
    minRestHours: 10,
    noDoubleShiftHours: 8,
    maxHoursPerWeek: 40,
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch('/api/coverage/rules');
    if (res.ok) {
      const data = await res.json();
      setRules({
        minRestHours: data.rules.minRestHours,
        noDoubleShiftHours: data.rules.noDoubleShiftHours,
        maxHoursPerWeek: data.rules.maxHoursPerWeek,
      });
    }
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await apiFetch('/api/coverage/rules', {
        method: 'PUT',
        body: JSON.stringify(rules),
      });
      if (res.ok) {
        setStatus({ type: 'success', text: 'Rules saved' });
      } else {
        const data = await res.json();
        setStatus({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof Rules) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setRules((r) => ({ ...r, [key]: Number(e.target.value) }));

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Auto Coverage Rules</h1>
        <Link href="/manager" className="text-sm text-indigo-600 hover:underline">
          ← Back
        </Link>
      </div>

      {status && (
        <div
          className={`mb-4 p-3 rounded-md text-sm ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {status.text}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Minimum rest hours between shifts</span>
          <input
            type="number"
            min={8}
            value={rules.minRestHours}
            onChange={field('minRestHours')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <span className="text-xs text-gray-500">Enforced minimum is 8 hours.</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">No double-shift window (hours)</span>
          <input
            type="number"
            min={0}
            value={rules.noDoubleShiftHours}
            onChange={field('noDoubleShiftHours')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Maximum hours per week</span>
          <input
            type="number"
            min={1}
            value={rules.maxHoursPerWeek}
            onChange={field('maxHoursPerWeek')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Rules'}
        </button>
      </form>
    </div>
  );
}
