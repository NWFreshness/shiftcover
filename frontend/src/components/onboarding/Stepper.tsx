'use client';

import type { OnboardingStatus, WizardStepId } from './types';

const steps: Array<{ id: WizardStepId; label: string; statusKey?: keyof OnboardingStatus['steps'] }> = [
  { id: 'business', label: '1 Business', statusKey: 'businessProfile' },
  { id: 'shifts', label: '2 Shift templates', statusKey: 'defaultShifts' },
  { id: 'team', label: '3 Team', statusKey: 'employees' },
  { id: 'rules', label: '4 Rules', statusKey: 'coverageRules' },
  { id: 'done', label: 'Done' },
];

interface StepperProps {
  current: WizardStepId;
  status: OnboardingStatus | null;
  onSelect: (step: WizardStepId) => void;
}

export default function Stepper({ current, status, onSelect }: StepperProps) {
  return (
    <nav aria-label="Onboarding steps" className="card animate-rise overflow-hidden p-3">
      <ol className="grid gap-2 md:grid-cols-5">
        {steps.map((step) => {
          const complete = step.id === 'done' ? Boolean(status?.completedAt) : Boolean(status && step.statusKey && status.steps[step.statusKey]);
          const active = current === step.id;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                  active ? 'border-pine bg-pine text-paper' : 'border-line bg-surface hover:border-pine/45'
                }`}
              >
                <span className="block font-display font-bold">{step.label}</span>
                <span className={`chip mt-2 ${complete ? 'chip-filled' : 'chip-neutral'}`}>
                  {complete ? 'Complete' : step.id === 'done' ? 'Finish when ready' : 'Open'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
