import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ONBOARDING_STEP_COUNT, onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';

type Props = {
  step: number;
  /** Defaults to the post-auth step count. Pre-auth questions pass their own total. */
  totalSteps?: number;
  children: ReactNode;
  canNext: boolean;
  nextLabel?: string;
  onNext: () => void;
  /** Accepted so callers compile; back button is not rendered (iOS swipe-back still works). */
  backHref?: string;
  /** Accepted so callers compile; back button is not rendered. */
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
  nextLabel = 'Continue',
  onNext,
  hideFooter = false,
  hideNext = false,
  showProgress = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const safeTotal = Math.max(1, totalSteps);
  const progressRatio = Math.min(1, step / safeTotal);

  return (
    <KeyboardAvoidingView
      style={styles.kavRoot}
      behavior={Platform.OS === 'ios' ? 'height' : undefined}>
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + 8,
            paddingBottom: hideFooter || hideNext ? insets.bottom + 12 : 0,
          },
        ]}>
        {showProgress ? (
          <View
            style={styles.topRow}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Onboarding progress, step ${step} of ${safeTotal}`}
            accessibilityValue={{ min: 0, max: safeTotal, now: step }}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
            </View>
          </View>
        ) : (
          <View style={styles.topRow} />
        )}
        <View style={styles.shellBody}>{children}</View>
        {!hideFooter && !hideNext ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              onPress={onNext}
              style={[styles.primary, !canNext && styles.primaryDisabled]}
              disabled={!canNext}
              accessibilityRole="button"
              accessibilityLabel={nextLabel}>
              <Text style={[styles.primaryTxt, !canNext && styles.primaryTxtDisabled]}>
                {nextLabel}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
