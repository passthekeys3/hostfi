export interface OnboardingState {
  completed: boolean;
  /** Settings asked to show the wizard again even if a property already exists. */
  reopen?: boolean;
  currentStep: number;
  steps: {
    welcome: boolean;
    addProperty: boolean;
    setupBilling: boolean;
    choosePlan: boolean;
    addExpense: boolean;
  };
  selectedPlan?: "free" | "pro" | "business";
}

const STORAGE_KEY = "hostfi_onboarding";

const DEFAULT_STATE: OnboardingState = {
  completed: false,
  currentStep: 0,
  steps: {
    welcome: false,
    addProperty: false,
    setupBilling: false,
    choosePlan: false,
    addExpense: false,
  },
  selectedPlan: undefined,
};

export function getOnboardingState(): OnboardingState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    return JSON.parse(stored) as OnboardingState;
  } catch (error) {
    console.error('Failed to load onboarding state from localStorage:', error);
    return DEFAULT_STATE;
  }
}

export function setOnboardingState(state: OnboardingState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function completeOnboarding(): void {
  const state = getOnboardingState();
  setOnboardingState({ ...state, completed: true, reopen: false });
}

export function resetOnboarding(): void {
  setOnboardingState({ ...DEFAULT_STATE, completed: false, reopen: true });
}

export function updateStep(step: keyof OnboardingState["steps"], value: boolean): OnboardingState {
  const state = getOnboardingState();
  const updated = {
    ...state,
    steps: { ...state.steps, [step]: value },
  };
  setOnboardingState(updated);
  return updated;
}

export function setCurrentStep(step: number): void {
  const state = getOnboardingState();
  setOnboardingState({ ...state, currentStep: step });
}
