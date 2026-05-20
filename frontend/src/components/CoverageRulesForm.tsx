'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/auth';

interface Rules {
  minRestHours: number;
  noDoubleShiftHours: number;
  maxHoursPerWeek: number;
}

interface CoverageRulesFormProps {
  onSaved?: () => Promise<void> | void;
  submitLabel?: string;
}

export default function CoverageRulesForm({ onSaved, submitLabel = 'Save Rules' }: CoverageRulesFormProps) {
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

  useEffect(() => { load(); }, [load]);

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
        await onSaved?.();
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
    setRules((current) => ({ ...current, [key]: Number(e.target.value) }));

  return (
    <>
      {status && (
        <div className={`mb-4 animate-rise ${status.type === 'success' ? 'banner banner-success' : 'banner banner-error'}`}>
          {status.text}
        </div>
      )}
      <form onSubmit={handleSave} className="card animate-rise space-y-5 p-6">
        <div>
          <label className="field-label">Minimum rest hours between shifts</label>
          <input type="number" min={8} value={rules.minRestHours} onChange={field('minRestHours')} className="field" />
          <span className="mt-1 block text-xs text-ink-faint">Enforced minimum is 8 hours.</span>
        </div>

        <div>
          <label className="field-label">No double-shift window (hours)</label>
          <input type="number" min={0} value={rules.noDoubleShiftHours} onChange={field('noDoubleShiftHours')} className="field" />
        </div>

        <div>
          <label className="field-label">Maximum hours per week</label>
          <input type="number" min={1} value={rules.maxHoursPerWeek} onChange={field('maxHoursPerWeek')} className="field" />
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </form>
    </>
  );
}
