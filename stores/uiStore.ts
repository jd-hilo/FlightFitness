import { create } from 'zustand';

type UiState = {
  selectedPlanDay: number;
  setSelectedPlanDay: (i: number) => void;
};

export const useUiStore = create<UiState>((set) => ({
  selectedPlanDay: 0,
  setSelectedPlanDay: (i) => set({ selectedPlanDay: Math.min(6, Math.max(0, i)) }),
}));
