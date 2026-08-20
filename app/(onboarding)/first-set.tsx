import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ConfettiBurst } from '@/components/ConfettiBurst';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { ExerciseIcon } from '@/components/plan/ExerciseIcon';
import { theme } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { hapticImpact } from '@/lib/haptics';
import { completeOnboardingAfterFirstSession } from '@/lib/onboardingFirstSession';

export default function OnboardingFirstSetScreen() {
  const [done, setDone] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const advancing = useRef(false);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const goToRest = () => {
    if (advancing.current) return;
    advancing.current = true;
    router.push('/(onboarding)/first-rest' as Href);
  };

  const onCompleteSet = () => {
    if (done) return;
    setDone(true);
    hapticImpact();
    setCelebrateKey((k) => k + 1);
    track('onboarding first set completed');
    setTimeout(goToRest, 450);
  };

  const skipDemo = () => {
    void (async () => {
      const res = await completeOnboardingAfterFirstSession({ seedWorkout: false });
      if (!res.ok) {
        Alert.alert('Could not save your profile', `${res.error}\n\nCheck your connection and try again.`);
        return;
      }
      track('onboarding first set skipped');
      router.replace('/(onboarding)/upgrade-offer' as Href);
    })();
  };

  return (
    <OnboardingShell
      step={10}
      canNext={false}
      backHref="back"
      hideFooter
      onNext={() => {}}
      tip="Tap the set to mark it complete — that's how every workout in Flight works.">
      <Text style={styles.title}>Your first set</Text>
      <Text style={styles.subtitle}>
        Do a 20-second plank if you can — or just tap complete to feel the rest-and-verse loop.
      </Text>

      <View style={local.exCard}>
        <View style={local.exHead}>
          <ExerciseIcon catalogExerciseId="plank" size={28} fallback />
          <Text style={local.exName}>Plank</Text>
        </View>
        <Text style={local.exNotes}>Hold a strong line. Tap the set when you finish.</Text>

        <Pressable
          onPress={onCompleteSet}
          disabled={done}
          style={[local.setCard, done && local.setCardDone]}
          accessibilityRole="button"
          accessibilityLabel="Complete set 1">
          <View style={local.setCardHeader}>
            <Animated.View style={!done ? pulseStyle : undefined}>
              <MaterialIcons
                name={done ? 'check-circle' : 'radio-button-unchecked'}
                size={28}
                color={done ? theme.colors.gold : theme.colors.onSurfaceVariant}
              />
            </Animated.View>
            <View style={local.setBadge}>
              <Text style={local.setBadgeText}>1</Text>
            </View>
            <Text style={local.setCardTitle}>Set 1 · 20 sec</Text>
          </View>
        </Pressable>
      </View>

      <View style={local.navRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={local.skip}>Back</Text>
        </Pressable>
        <Pressable onPress={skipDemo} hitSlop={12}>
          <Text style={local.skip}>Skip for now</Text>
        </Pressable>
      </View>
      <ConfettiBurst playKey={celebrateKey} />
    </OnboardingShell>
  );
}

const local = StyleSheet.create({
  exCard: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 14,
    gap: 10,
  },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exName: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    flex: 1,
  },
  exNotes: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  setCard: {
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surfaceContainerHigh,
    padding: 14,
  },
  setCardDone: { opacity: 0.7, borderColor: theme.colors.outline },
  setCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  setBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeText: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 12,
    color: theme.colors.onGold,
  },
  setCardTitle: {
    flex: 1,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    color: theme.colors.onBackground,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  navRow: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skip: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
});
