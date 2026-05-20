'use client';

import EmployeeManager from '@/components/EmployeeManager';

interface StepProps {
  onBack: () => void;
  onNext: () => void;
  refreshStatus: () => Promise<void>;
}

export default function StepTeam({ onBack, onNext, refreshStatus }: StepProps) {
  return (
    <div className="card space-y-5 p-6">
      <div>
        <span className="label-stamp">Step 3</span>
        <h2 className="font-display text-2xl font-bold text-ink">Team and invite codes</h2>
        <p className="mt-1 text-sm text-ink-soft">Add staff, copy their code, or text it when SMS is enabled.</p>
      </div>
      <EmployeeManager compact onChanged={refreshStatus} />
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="btn btn-ghost">Back</button>
        <button type="button" onClick={onNext} className="btn btn-primary">Continue</button>
      </div>
    </div>
  );
}
