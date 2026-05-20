'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/auth';

const industries = [
  'Food & Beverage',
  'Cleaning & Janitorial',
  'Hospitality',
  'Retail',
  'Healthcare support',
  'Field service',
];

interface StepProps {
  onNext: () => void;
  refreshStatus: () => Promise<void>;
}

export default function StepBusiness({ onNext, refreshStatus }: StepProps) {
  const [name, setName] = useState('');
  const [industryType, setIndustryType] = useState(industries[0]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch('/api/businesses')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.business) return;
        setName(data.business.name || '');
        setIndustryType(data.business.industryType || industries[0]);
      });
    return () => { active = false; };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/businesses', {
        method: 'PUT',
        body: JSON.stringify({ name, industryType }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || 'Could not save business profile');
        return;
      }
      await refreshStatus();
      onNext();
    } catch {
      setMessage('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="card space-y-5 p-6">
      <div>
        <span className="label-stamp">Step 1</span>
        <h2 className="font-display text-2xl font-bold text-ink">Business profile</h2>
        <p className="mt-1 text-sm text-ink-soft">This is how your workplace appears to staff.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="business-name">Business name</label>
          <input id="business-name" className="field" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="field-label" htmlFor="industry">Industry</label>
          <select id="industry" className="field" value={industryType} onChange={(e) => setIndustryType(e.target.value)}>
            {industries.map((industry) => <option key={industry}>{industry}</option>)}
          </select>
        </div>
      </div>
      {message && <div className="banner banner-error">{message}</div>}
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save and continue'}</button>
      </div>
    </form>
  );
}
