'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import StepBusiness from '@/components/onboarding/StepBusiness';
import StepDefaultShifts from '@/components/onboarding/StepDefaultShifts';
import StepRules from '@/components/onboarding/StepRules';
import StepTeam from '@/components/onboarding/StepTeam';
import WizardShell from '@/components/onboarding/WizardShell';
import type { OnboardingStatus, WizardStepId } from '@/components/onboarding/types';
import { apiFetch, getToken, isManager, MANAGER_ONBOARDING_SKIP_KEY } from '@/lib/auth';

const orderedSteps: WizardStepId[] = ['business', 'shifts', 'team', 'rules', 'done'];

export default function ManagerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStepId>('business');
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const res = await apiFetch('/api/onboarding/status');
    if (!res.ok) {
      setError('Could not load onboarding status');
      return;
    }
    setStatus(await res.json());
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
    refreshStatus().finally(() => setLoading(false));
  }, [router, refreshStatus]);

  const next = () => {
    const index = orderedSteps.indexOf(step);
    setStep(orderedSteps[Math.min(index + 1, orderedSteps.length - 1)]);
  };

  const back = () => {
    const index = orderedSteps.indexOf(step);
    setStep(orderedSteps[Math.max(index - 1, 0)]);
  };

  const skipToDashboard = () => {
    localStorage.setItem(MANAGER_ONBOARDING_SKIP_KEY, '1');
    router.replace('/manager');
  };

  const finishWithoutRules = async () => {
    const res = await apiFetch('/api/onboarding/complete', { method: 'POST' });
    if (res.ok) {
      localStorage.removeItem(MANAGER_ONBOARDING_SKIP_KEY);
      router.replace('/manager');
    }
  };

  let content = null;
  if (loading) {
    content = <div className="card p-6 text-sm text-ink-soft">Loading setup…</div>;
  } else if (error) {
    content = <div className="banner banner-error">{error}</div>;
  } else if (step === 'business') {
    content = <StepBusiness onNext={next} refreshStatus={refreshStatus} />;
  } else if (step === 'shifts') {
    content = <StepDefaultShifts onBack={back} onNext={next} refreshStatus={refreshStatus} />;
  } else if (step === 'team') {
    content = <StepTeam onBack={back} onNext={next} refreshStatus={refreshStatus} />;
  } else if (step === 'rules') {
    content = <StepRules onBack={back} refreshStatus={refreshStatus} />;
  } else {
    content = (
      <div className="card space-y-5 p-6 text-center">
        <span className="label-stamp">Done</span>
        <h2 className="font-display text-2xl font-bold text-ink">You can open the schedule now</h2>
        <p className="mx-auto max-w-lg text-sm text-ink-soft">
          You can finish with your current setup and adjust templates, employees, and rules later.
        </p>
        <div className="flex justify-center gap-2">
          <button type="button" onClick={back} className="btn btn-ghost">Back</button>
          <button type="button" onClick={finishWithoutRules} className="btn btn-accent">Skip to dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopBar>
        <button type="button" onClick={skipToDashboard} className="btn btn-ghost btn-sm">Skip</button>
      </TopBar>
      <WizardShell step={step} status={status} onStepChange={setStep}>
        {content}
      </WizardShell>
    </>
  );
}
