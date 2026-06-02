import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { theme } from '@/constants/theme';
import {
  persistProfileFirstName,
  pullProfileFirstNameIntoStore,
} from '@/lib/api/profileFirstName';
import { useOnboardingStore } from '@/stores/onboardingStore';

const FIRST_NAME_MAX = 40;

function normalizeFirstNameInput(raw: string): string {
  const s = raw.replace(/\s+/g, ' ').trimStart();
  return s.slice(0, FIRST_NAME_MAX);
}

export default function OnboardingNameScreen() {
  const answers = useOnboardingStore((s) => s.answers);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);
  const canNext = answers.firstName.trim().length > 0;

  useEffect(() => {
    void pullProfileFirstNameIntoStore();
  }, []);

  const onNext = () => {
    if (!canNext) return;
    const first = answers.firstName.trim();
    void (async () => {
      if (first) {
        const res = await persistProfileFirstName(first);
        if (__DEV__ && !res.ok) console.warn('[persistProfileFirstName]', res.error);
      }
      router.push('/(onboarding)/body-metrics');
    })();
  };

  return (
    <OnboardingShell step={1} canNext={canNext} onNext={onNext} nextLabel="Continue">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chipsScroll}>
        <Text style={styles.title}>What should we call you?</Text>
        <Text style={styles.subtitle}>
          Your first name powers greetings across Flight Fitness — not your sign-in email.
        </Text>
        <TextInput
          style={styles.textField}
          placeholder="First name"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="name-given"
          textContentType="givenName"
          returnKeyType="done"
          onSubmitEditing={onNext}
          value={answers.firstName}
          onChangeText={(t) => setAnswers({ firstName: normalizeFirstNameInput(t) })}
          maxLength={FIRST_NAME_MAX}
          accessibilityLabel="First name"
        />
      </ScrollView>
    </OnboardingShell>
  );
}
