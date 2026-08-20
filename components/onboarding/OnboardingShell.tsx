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

import { OnboardingTooltip } from '@/components/onboarding/OnboardingTooltip';
import { ONBOARDING_STEP_COUNT, onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';

type Props = {
  step: number;
  children: ReactNode;
  canNext: boolean;
  nextLabel?: string;
  onNext: () => void;
  backHref?: string;
  hideFooter?: boolean;
  /** Coach mark — onboarding only. */
  tip?: string;
};

export function OnboardingShell({
  step,
  children,
  canNext,
  nextLabel = 'Next',
  onNext,
  backHref,
  hideFooter = false,
  tip,
}: Props) {
  const insets = useSafeAreaInsets();
  const progressRatio = Math.min(1, step / ONBOARDING_STEP_COUNT);

  const onBack = () => {
    if (backHref) router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.kavRoot}
      behavior={Platform.OS === 'ios' ? 'height' : undefined}>
      <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: hideFooter ? insets.bottom + 12 : 0 }]}>
        <Text style={styles.brand}>FLIGHT FITNESS</Text>
        <View
          style={styles.progressTrack}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Onboarding progress, step ${step} of ${ONBOARDING_STEP_COUNT}`}
          accessibilityValue={{ min: 0, max: ONBOARDING_STEP_COUNT, now: step }}>
          <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
        </View>
        {tip ? <OnboardingTooltip text={tip} /> : null}
        {children}
        {!hideFooter ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
            <Pressable
              onPress={onBack}
              style={styles.secondary}
              disabled={!backHref}>
              <Text style={[styles.secondaryTxt, !backHref && styles.disabled]}>Back</Text>
            </Pressable>
            <Pressable
              onPress={onNext}
              style={[styles.primary, !canNext && styles.primaryDisabled]}
              disabled={!canNext}>
              <Text style={styles.primaryTxt}>{nextLabel}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
