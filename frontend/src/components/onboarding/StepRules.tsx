'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CoverageRulesForm from '@/components/CoverageRulesForm';
import { apiFetch, MANAGER_ONBOARDING_SKIP_KEY } from '@/lib/auth';

interface StepProps {
  onBack: () => void;
  refreshStatus: () => Promise<void>;
}

export default function StepRules({ onBack, refreshStatus }: StepProps) {
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    setFinishing(true);
    setError(null);
    try {
      const res = await apiFetch('/api/onboarding/complete', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Could not finish onboarding');
        return;
      }
      await refreshStatus();
      localStorage.removeItem(MANAGER_ONBOARDING_SKIP_KEY);
      router.replace('/manager');
    } catch {
      setError('Network error');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <span className="label-stamp">Step 4</span>
        <h2 className="font-display text-2xl font-bold text-ink">Coverage rules</h2>
        <p className="mt-1 text-sm text-ink-soft">Set the guardrails auto-coverage uses when filling open shifts.</p>
      </div>
      <CoverageRulesForm onSaved={refreshStatus} submitLabel="Save rules" />
      {error && <div className="banner banner-error">{error}</div>}
      <div className="card flex justify-between p-4">
        <button type="button" onClick={onBack} className="btn btn-ghost">Back</button>
        <button type="button" onClick={finish} disabled={finishing} className="btn btn-accent">
          {finishing ? 'Finishing…' : 'Finish onboarding'}
        </button>
      </div>
    </div>
  );
}
