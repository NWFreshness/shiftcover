'use client';

import { useCallback, useEffect, useState } from 'react';
import DefaultShiftForm, { type DefaultShift, type DefaultShiftInput } from '@/components/DefaultShiftForm';
import { apiFetch } from '@/lib/auth';

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface StepProps {
  onBack: () => void;
  onNext: () => void;
  refreshStatus: () => Promise<void>;
}

export default function StepDefaultShifts({ onBack, onNext, refreshStatus }: StepProps) {
  const [shifts, setShifts] = useState<DefaultShift[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch('/api/default-shifts');
    if (res.ok) {
      const data = await res.json();
      setShifts(data.defaultShifts || []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveNew = async (input: DefaultShiftInput) => {
    setMessage(null);
    const res = await apiFetch('/api/default-shifts', { method: 'POST', body: JSON.stringify(input) });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || 'Could not add shift template');
      return;
    }
    await load();
    await refreshStatus();
  };

  const saveEdit = async (id: string, input: DefaultShiftInput) => {
    setMessage(null);
    const res = await apiFetch(`/api/default-shifts/${id}`, { method: 'PUT', body: JSON.stringify(input) });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || 'Could not update shift template');
      return;
    }
    setEditingId(null);
    await load();
    await refreshStatus();
  };

  const remove = async (id: string) => {
    const res = await apiFetch(`/api/default-shifts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await load();
      await refreshStatus();
    }
  };

  return (
    <div className="card space-y-5 p-6">
      <div>
        <span className="label-stamp">Step 2</span>
        <h2 className="font-display text-2xl font-bold text-ink">Default shift templates</h2>
        <p className="mt-1 text-sm text-ink-soft">Store the shifts you schedule over and over. Applying templates to a week comes later.</p>
      </div>

      <DefaultShiftForm onSubmit={saveNew} />
      {message && <div className="banner banner-error">{message}</div>}

      <div className="space-y-3">
        {shifts.length === 0 ? (
          <div className="banner banner-info">No templates yet. Add at least one to make future scheduling faster.</div>
        ) : shifts.map((shift) => (
          <div key={shift.id} className="rounded-2xl border border-line bg-paper p-4">
            {editingId === shift.id ? (
              <DefaultShiftForm initial={shift} submitLabel="Save template" onSubmit={(input) => saveEdit(shift.id, input)} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">{shift.label}</h3>
                  <p className="text-sm text-ink-soft">{shift.role} · <span className="font-mono">{shift.startTime}–{shift.endTime}</span>{shift.site ? ` · ${shift.site}` : ''}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(shift.daysOfWeek || []).map((day) => <span key={day} className="chip chip-neutral">{dayLabels[day]}</span>)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingId(shift.id)} className="btn btn-ghost btn-sm">Edit</button>
                  <button type="button" onClick={() => remove(shift.id)} className="btn btn-danger btn-sm">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="btn btn-ghost">Back</button>
        <button type="button" onClick={onNext} className="btn btn-primary">Continue</button>
      </div>
    </div>
  );
}
