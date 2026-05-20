export interface OnboardingSteps {
  businessProfile: boolean;
  defaultShifts: boolean;
  employees: boolean;
  coverageRules: boolean;
}

export interface OnboardingStatus {
  completedAt: string | null;
  steps: OnboardingSteps;
}

export type WizardStepId = 'business' | 'shifts' | 'team' | 'rules' | 'done';
