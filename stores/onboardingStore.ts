import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  ALLERGY_NONE_ID,
  INJURY_NONE_ID,
  MAX_ALLERGY_SELECTIONS,
  MAX_INJURY_SELECTIONS,
  isTrainingTimeWindowId,
} from '@/lib/onboardingOptions';
import type { OnboardingAnswers } from '@/types/plan';

const MAX_MODIFIERS = 5;
const MAX_FOOD_PREFS = 5;
const MAX_TIME_WINDOWS = 2;

const defaultAnswers: OnboardingAnswers = {
  goal: '',
  experience: '',
  equipment: [],
  dietPattern: '',
  dietModifiers: [],
  foodPreferences: [],
  trainingDaysPerWeek: '',
  trainingTimePrefs: [],
  currentWeightLb: 185,
  targetWeightLb: 185,
  sex: '',
  ageYears: 30,
  heightInches: 68,
  sessionLengthId: '',
  injuryLimitationIds: [],
  injuryNotes: '',
  allergyIds: [],
  allergyOtherNotes: '',
  dietOtherNotes: '',
  nutritionPaceId: '',
  mealsPerDayId: '',
  cookingSkillId: '',
};

type SingleStringKey =
  | 'goal'
  | 'experience'
  | 'dietPattern'
  | 'trainingDaysPerWeek'
  | 'sex'
  | 'sessionLengthId'
  | 'nutritionPaceId'
  | 'mealsPerDayId'
  | 'cookingSkillId';

type NotesKey = 'injuryNotes' | 'dietOtherNotes' | 'allergyOtherNotes';

type OnboardingState = {
  answers: OnboardingAnswers;
  completedAt: string | null;
  setSingle: (key: SingleStringKey, value: string) => void;
  toggleEquipment: (optionId: string) => void;
  toggleDietModifier: (optionId: string) => void;
  toggleFoodPreference: (optionId: string) => void;
  toggleTrainingTime: (optionId: string) => void;
  toggleInjuryLimitation: (optionId: string) => void;
  toggleAllergy: (optionId: string) => void;
  setNotes: (key: NotesKey, value: string) => void;
  setAnswers: (partial: Partial<OnboardingAnswers>) => void;
  setWeight: (key: 'currentWeightLb' | 'targetWeightLb', value: number) => void;
  complete: () => void;
  reset: () => void;
};

function toggleCapped(list: string[], id: string, max: number): string[] {
  const has = list.includes(id);
  if (has) return list.filter((x) => x !== id);
  if (list.length >= max) return list;
  return [...list, id];
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      answers: { ...defaultAnswers },
      completedAt: null,
      setSingle: (key, value) =>
        set((s) => ({
          answers: { ...s.answers, [key]: value },
        })),
      toggleEquipment: (optionId) =>
        set((s) => {
          const cur = s.answers.equipment;
          const has = cur.includes(optionId);
          const next = has
            ? cur.filter((id) => id !== optionId)
            : [...cur, optionId];
          return { answers: { ...s.answers, equipment: next } };
        }),
      toggleDietModifier: (optionId) =>
        set((s) => ({
          answers: {
            ...s.answers,
            dietModifiers: toggleCapped(
              s.answers.dietModifiers,
              optionId,
              MAX_MODIFIERS
            ),
          },
        })),
      toggleFoodPreference: (optionId) =>
        set((s) => ({
          answers: {
            ...s.answers,
            foodPreferences: toggleCapped(
              s.answers.foodPreferences,
              optionId,
              MAX_FOOD_PREFS
            ),
          },
        })),
      toggleTrainingTime: (optionId) =>
        set((s) => {
          const cur = s.answers.trainingTimePrefs;
          const FLEX = 'flexible_training';
          const has = cur.includes(optionId);

          if (optionId === FLEX) {
            return {
              answers: {
                ...s.answers,
                trainingTimePrefs: has ? [] : [FLEX],
              },
            };
          }

          let next = cur.filter((id) => id !== FLEX);
          if (has) {
            next = next.filter((id) => id !== optionId);
          } else if (isTrainingTimeWindowId(optionId)) {
            const windows = next.filter(isTrainingTimeWindowId);
            const rest = next.filter((id) => !isTrainingTimeWindowId(id));
            if (windows.length >= MAX_TIME_WINDOWS) {
              const trimmed = windows.slice(1);
              next = [...trimmed, optionId, ...rest];
            } else {
              next = [...next, optionId];
            }
          } else {
            next = [...next, optionId];
          }

          return { answers: { ...s.answers, trainingTimePrefs: next } };
        }),
      toggleInjuryLimitation: (optionId) =>
        set((s) => {
          const cur = s.answers.injuryLimitationIds;
          const has = cur.includes(optionId);
          if (optionId === INJURY_NONE_ID) {
            return {
              answers: {
                ...s.answers,
                injuryLimitationIds: has ? [] : [INJURY_NONE_ID],
              },
            };
          }
          if (!has && cur.filter((id) => id !== INJURY_NONE_ID).length >= MAX_INJURY_SELECTIONS) {
            return s;
          }
          let next = has
            ? cur.filter((id) => id !== optionId)
            : [...cur.filter((id) => id !== INJURY_NONE_ID), optionId];
          return { answers: { ...s.answers, injuryLimitationIds: next } };
        }),
      toggleAllergy: (optionId) =>
        set((s) => {
          const cur = s.answers.allergyIds;
          const has = cur.includes(optionId);
          if (optionId === ALLERGY_NONE_ID) {
            return {
              answers: {
                ...s.answers,
                allergyIds: has ? [] : [ALLERGY_NONE_ID],
              },
            };
          }
          if (!has && cur.filter((id) => id !== ALLERGY_NONE_ID).length >= MAX_ALLERGY_SELECTIONS) {
            return s;
          }
          let next = has
            ? cur.filter((id) => id !== optionId)
            : [...cur.filter((id) => id !== ALLERGY_NONE_ID), optionId];
          return { answers: { ...s.answers, allergyIds: next } };
        }),
      setNotes: (key, value) =>
        set((s) => ({
          answers: { ...s.answers, [key]: value },
        })),
      setAnswers: (partial) =>
        set((s) => ({
          answers: { ...s.answers, ...partial },
        })),
      setWeight: (key, value) =>
        set((s) => ({
          answers: { ...s.answers, [key]: value },
        })),
      complete: () =>
        set({
          completedAt: new Date().toISOString(),
        }),
      reset: () =>
        set({
          answers: { ...defaultAnswers },
          completedAt: null,
        }),
    }),
    {
      name: 'flight-onboarding-v5',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<Pick<OnboardingState, 'answers' | 'completedAt'>> | undefined;
        if (!p || typeof p !== 'object') return current;
        const merged: OnboardingAnswers = {
          ...defaultAnswers,
          ...(p.answers ?? {}),
        };
        if (!merged.sex) merged.sex = 'sex_prefer_not';
        if (!merged.sessionLengthId) merged.sessionLengthId = 'session_45';
        if (!merged.nutritionPaceId) merged.nutritionPaceId = 'pace_sustainable';
        if (!merged.mealsPerDayId) merged.mealsPerDayId = 'meals_3_snack';
        if (!merged.cookingSkillId) merged.cookingSkillId = 'cook_comfortable';
        return {
          ...current,
          completedAt: p.completedAt ?? current.completedAt,
          answers: merged,
        };
      },
    }
  )
);

export function useOnboardingComplete() {
  return useOnboardingStore((s) => s.completedAt != null);
}

export function isStepComplete(
  answers: OnboardingAnswers,
  stepId: string
): boolean {
  switch (stepId) {
    case 'goal':
      return answers.goal.length > 0;
    case 'aboutSex':
      return answers.sex.length > 0;
    case 'aboutAge':
      return answers.ageYears >= 16 && answers.ageYears <= 90;
    case 'aboutHeight':
      return answers.heightInches >= 54 && answers.heightInches <= 84;
    case 'experience':
      return answers.experience.length > 0;
    case 'equipment':
      return answers.equipment.length > 0;
    case 'sessionInjury':
      return answers.sessionLengthId.length > 0;
    case 'dietPattern':
      return answers.dietPattern.length > 0;
    case 'dietModifiers':
      return true;
    case 'foodPreferences':
      return true;
    case 'dietOtherNotes':
      return true;
    case 'allergies':
      return true;
    case 'trainingDays':
      return answers.trainingDaysPerWeek.length > 0;
    case 'trainingTimes':
      return answers.trainingTimePrefs.length > 0;
    case 'paceKitchen':
      return (
        answers.nutritionPaceId.length > 0 &&
        answers.mealsPerDayId.length > 0 &&
        answers.cookingSkillId.length > 0
      );
    case 'weightCurrent':
    case 'weightTarget':
      return true;
    default:
      return false;
  }
}
