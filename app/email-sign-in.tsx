import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { theme } from '@/constants/theme';
import { requestEmailOtp, verifyEmailOtp } from '@/lib/emailOtpAuth';
import { supabaseConfigured } from '@/lib/supabase';

type Step = 'email' | 'code';

function nextParamIsOnboarding(next: string | string[] | undefined) {
  if (next === 'onboarding') return true;
  return Array.isArray(next) && next[0] === 'onboarding';
}

export default function EmailSignInScreen() {
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  const afterAuthToOnboarding = nextParamIsOnboarding(next);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSendCode = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await requestEmailOtp(email);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStep('code');
    } finally {
      setBusy(false);
    }
  }, [email]);

  const onVerify = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await verifyEmailOtp(email, code);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (afterAuthToOnboarding) {
        router.replace('/(onboarding)' as Href);
      } else {
        router.replace('/' as Href);
      }
    } finally {
      setBusy(false);
    }
  }, [afterAuthToOnboarding, code, email]);

  const onBack = useCallback(() => {
    if (step === 'code') {
      setStep('email');
      setCode('');
      setError(null);
      return;
    }
    router.back();
  }, [step]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button">
          <Text style={styles.back}>Back</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>
        {afterAuthToOnboarding ? 'Verify your email' : 'Sign in with email'}
      </Text>
      <Text style={styles.sub}>
        {step === 'email'
          ? afterAuthToOnboarding
            ? 'Use the email you want on your account. We will send a 6-digit code—no password—then you will set up your profile.'
            : 'We will email you a 6-digit code. No password.'
          : `Enter the code sent to ${email}`}
      </Text>

      {!supabaseConfigured ? (
        <Text style={styles.warn}>
          Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to use email sign-in.
        </Text>
      ) : null}

      {step === 'email' ? (
        <>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="email-address"
            returnKeyType="done"
            blurOnSubmit
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy && supabaseConfigured}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>6-digit code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
            placeholder="000000"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="number-pad"
            returnKeyType="done"
            blurOnSubmit
            maxLength={8}
            editable={!busy}
          />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.primary, (busy || !supabaseConfigured) && styles.primaryDisabled]}
        onPress={() => void (step === 'email' ? onSendCode() : onVerify())}
        disabled={busy || !supabaseConfigured}>
        {busy ? (
          <AppLoadingCross size="small" />
        ) : (
          <Text style={styles.primaryTxt}>{step === 'email' ? 'Send code' : 'Verify & continue'}</Text>
        )}
      </Pressable>

      {step === 'code' ? (
        <Pressable style={styles.resend} onPress={() => void onSendCode()} disabled={busy}>
          <Text style={styles.resendTxt}>Resend code</Text>
        </Pressable>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
  },
  headerRow: { marginBottom: 20 },
  back: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.gold,
  },
  title: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 24,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sub: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 24,
  },
  warn: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.error,
    marginBottom: 16,
  },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: theme.fonts.body,
    fontSize: 17,
    color: theme.colors.onBackground,
    marginBottom: 16,
  },
  error: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.error,
    marginBottom: 12,
  },
  primary: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryDisabled: { opacity: 0.55 },
  primaryTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
  },
  resend: { alignItems: 'center', paddingVertical: 16 },
  resendTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    color: theme.colors.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
