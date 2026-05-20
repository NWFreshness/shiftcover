'use client';

import { useState } from 'react';

export interface DefaultShift {
  id: string;
  label: string;
  role: string;
  startTime: string;
  endTime: string;
  site?: string | null;
  daysOfWeek: number[];
}

export type DefaultShiftInput = Omit<DefaultShift, 'id'>;

const weekdays = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const emptyShift: DefaultShiftInput = {
  label: '',
  role: '',
  startTime: '09:00',
  endTime: '17:00',
  site: '',
  daysOfWeek: [1, 2, 3, 4, 5],
};

interface DefaultShiftFormProps {
  initial?: DefaultShift;
  submitLabel?: string;
  onSubmit: (shift: DefaultShiftInput) => Promise<void> | void;
  onCancel?: () => void;
}

export default function DefaultShiftForm({ initial, submitLabel = 'Add template', onSubmit, onCancel }: DefaultShiftFormProps) {
  const [form, setForm] = useState<DefaultShiftInput>(initial ? {
    label: initial.label,
    role: initial.role,
    startTime: initial.startTime,
    endTime: initial.endTime,
    site: initial.site || '',
    daysOfWeek: initial.daysOfWeek || [],
  } : emptyShift);
  const [saving, setSaving] = useState(false);

  const setField = (key: keyof DefaultShiftInput, value: string | number[]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleDay = (day: number) => {
    setForm((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((item) => item !== day)
        : [...current.daysOfWeek, day].sort(),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ ...form, site: form.site?.trim() || undefined });
      if (!initial) setForm(emptyShift);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2">
      <div>
        <label className="field-label">Label</label>
        <input className="field" value={form.label} onChange={(e) => setField('label', e.target.value)} placeholder="Morning bar" required />
      </div>
      <div>
        <label className="field-label">Role</label>
        <input className="field" value={form.role} onChange={(e) => setField('role', e.target.value)} placeholder="Server" required />
      </div>
      <div>
        <label className="field-label">Start</label>
        <input type="time" className="field font-mono" value={form.startTime} onChange={(e) => setField('startTime', e.target.value)} required />
      </div>
      <div>
        <label className="field-label">End</label>
        <input type="time" className="field font-mono" value={form.endTime} onChange={(e) => setField('endTime', e.target.value)} required />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Site / station</label>
        <input className="field" value={form.site || ''} onChange={(e) => setField('site', e.target.value)} placeholder="Front counter" />
      </div>
      <div className="sm:col-span-2">
        <span className="field-label">Typical days</span>
        <div className="flex flex-wrap gap-2">
          {weekdays.map((day) => {
            const checked = form.daysOfWeek.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`chip ${checked ? 'chip-info' : 'chip-neutral'}`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2 sm:col-span-2 sm:justify-end">
        {onCancel && <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>}
        <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
