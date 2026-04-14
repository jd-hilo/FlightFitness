import { create } from 'zustand';

/** True while `ensureCurrentWeekPlan` is fetching/restoring or generating the current calendar week. */
type State = {
  inProgress: boolean;
  setInProgress: (v: boolean) => void;
};

export const usePlanWeekEnsureStore = create<State>((set) => ({
  inProgress: false,
  setInProgress: (inProgress) => set({ inProgress }),
}));
