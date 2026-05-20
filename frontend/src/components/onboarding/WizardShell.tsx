'use client';

import type { ReactNode } from 'react';
import Stepper from './Stepper';
import type { OnboardingStatus, WizardStepId } from './types';

interface WizardShellProps {
  step: WizardStepId;
  status: OnboardingStatus | null;
  onStepChange: (step: WizardStepId) => void;
  children: ReactNode;
}

export default function WizardShell({ step, status, onStepChange, children }: WizardShellProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 animate-rise">
        <span className="label-stamp">Owner onboarding</span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Set up your coverage board
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Build the practical pieces first: business profile, reusable shift templates, your team, and the rules that keep coverage sane.
        </p>
      </div>
      <Stepper current={step} status={status} onSelect={onStepChange} />
      <section className="mt-6 animate-rise" style={{ animationDelay: '0.08s' }}>
        {children}
      </section>
    </div>
  );
}
