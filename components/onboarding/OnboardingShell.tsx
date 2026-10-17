import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ONBOARDING_STEP_COUNT, onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';

function FlightFitnessWordmark() {
  return (
    <Text style={styles.brand} accessibilityRole="header">
      FLIGHT FITNESS
    </Text>
  );
}

type Props = {
  step: number;
  /** Defaults to the post-auth step count. Pre-auth questions pass their own total. */
  totalSteps?: number;
  children: ReactNode;
  canNext: boolean;
  nextLabel?: string;
  onNext: () => void;
  backHref?: string;
  /** When set, Back calls this instead of router.back(). */
  onBackPress?: () => void;
  hideFooter?: boolean;
  hideNext?: boolean;
  showProgress?: boolean;
};

export function OnboardingShell({
  step,
  totalSteps = ONBOARDING_STEP_COUNT,
  children,
  canNext,
  nextLabel = 'Next',
  onNext,
  backHref,
  onBackPress,
  hideFooter = false,
  hideNext = false,
  showProgress = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const safeTotal = Math.max(1, totalSteps);
  const progressRatio = Math.min(1, step / safeTotal);
  const canBack = Boolean(onBackPress || backHref);

  const onBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (backHref) router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.kavRoot}
      behavior={Platform.OS === 'ios' ? 'height' : undefined}>
      <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: hideFooter ? insets.bottom + 12 : 0 }]}>
        <FlightFitnessWordmark />
        {showProgress ? (
          <View
            style={styles.progressTrack}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Onboarding progress, step ${step} of ${safeTotal}`}
            accessibilityValue={{ min: 0, max: safeTotal, now: step }}>
            <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
          </View>
        ) : null}
        <View style={styles.shellBody}>{children}</View>
        {!hideFooter ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
            <Pressable
              onPress={onBack}
              style={styles.secondary}
              disabled={!canBack}>
              <Text style={[styles.secondaryTxt, !canBack && styles.disabled]}>Back</Text>
            </Pressable>
            {hideNext ? null : (
              <Pressable
                onPress={onNext}
                style={[styles.primary, !canNext && styles.primaryDisabled]}
                disabled={!canNext}>
                <Text style={styles.primaryTxt}>{nextLabel}</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
