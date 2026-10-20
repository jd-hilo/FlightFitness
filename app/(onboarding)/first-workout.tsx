import { useFocusEffect } from '@react-navigation/native';
import { router, type Href } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { backOrReplace } from '@/components/onboarding/backOrReplace';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { theme } from '@/constants/theme';
import { FREE_TIER_MAX_SAVED_WORKOUTS } from '@/stores/subscriptionStore';
import { ensureStarterWorkout, STARTER_WORKOUTS, type StarterWorkoutId } from '@/lib/starterWorkouts';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';

const SLIDES = '/(onboarding)/feature-slides' as Href;

export default function FirstWorkoutScreen() {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  useFocusEffect(
    useCallback(() => {
      lock.current = false;
      setBusy(false);
    }, [])
  );

  const goSlides = () => {
    router.push(SLIDES);
  };

  const libraryFull = () => {
    lock.current = false;
    setBusy(false);
    Alert.alert(
      'Workout library is full',
      `Free includes up to ${FREE_TIER_MAX_SAVED_WORKOUTS} saved workouts. You can continue with a workout you already saved.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Continue', onPress: goSlides },
      ]
    );
  };

  const onStarter = (id: StarterWorkoutId) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const workoutId = ensureStarterWorkout(id);
    if (!workoutId) {
      libraryFull();
      return;
    }
    goSlides();
  };

  const onCreate = () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const id = useWorkoutLibraryStore.getState().createWorkout('My workout');
    if (!id) {
      libraryFull();
      return;
    }
    router.push(`/workout/${id}?onboarding=1` as Href);
  };

  return (
    <OnboardingShell
      step={2}
      canNext={false}
      hideNext
      onNext={() => {}}
      onBackPress={() => backOrReplace('/(onboarding)/faith-goals' as Href)}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}>
        <Text style={styles.title}>Ready for a workout?</Text>
        <Text style={styles.subtitle}>Pick a starter, or build your own.</Text>
        {STARTER_WORKOUTS.map((workout) => (
          <Pressable
            key={workout.id}
            disabled={busy}
            onPress={() => onStarter(workout.id)}
            style={[styles.chip, local.card, busy && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel={`${workout.title}. ${workout.summary}`}>
            <Text style={styles.chipText}>{workout.title}</Text>
            <Text style={local.summary}>{workout.summary}</Text>
          </Pressable>
        ))}
        <Pressable
          disabled={busy}
          onPress={onCreate}
          style={local.create}
          accessibilityRole="button"
          accessibilityLabel="Create a workout">
          <Text style={local.createTxt}>Create a workout</Text>
        </Pressable>
      </ScrollView>
    </OnboardingShell>
  );
}

const local = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: 10,
  },
  summary: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  create: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  createTxt: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.champagne,
  },
});
