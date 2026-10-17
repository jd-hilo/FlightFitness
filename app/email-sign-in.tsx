import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { finishAuthAndRoute } from '@/components/onboarding/enterOnboarding';
import { theme } from '@/constants/theme';
import { requestEmailOtp, verifyEmailOtp } from '@/lib/emailOtpAuth';
import { supabaseConfigured } from '@/lib/supabase';

type Step = 'email' | 'code';

type FormError = { message: string; caption?: string; variant?: 'default' | 'notice' };

const RESEND_COOLDOWN_SEC = 30;

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
  const [verified, setVerified] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [formError, setFormError] = useState<FormError | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const onSendCode = useCallback(async () => {
    setFormError(null);
    setBusy(true);
    try {
      const res = await requestEmailOtp(email);
      if (!res.ok) {
        setFormError({ message: res.error });
        return;
      }
      setStep('code');
      setResendIn(RESEND_COOLDOWN_SEC);
    } finally {
      setBusy(false);
    }
  }, [email]);

  const continueAfterVerify = useCallback(async () => {
    if (afterAuthToOnboarding) {
      const nextRoute = await finishAuthAndRoute();
      if (!nextRoute.ok) {
        setFormError({ message: nextRoute.error });
        return;
      }
      return;
    }
    router.replace('/' as Href);
  }, [afterAuthToOnboarding]);

  const onVerify = useCallback(async () => {
    setFormError(null);
    setBusy(true);
    try {
      if (!verified) {
        const res = await verifyEmailOtp(email, code);
        if (!res.ok) {
          setFormError({
            message: res.error,
            caption: res.caption,
            variant: res.variant ?? 'default',
          });
          return;
        }
        setVerified(true);
      }
      await continueAfterVerify();
    } finally {
      setBusy(false);
    }
  }, [code, continueAfterVerify, email, verified]);

  const onBack = useCallback(() => {
    if (step === 'code' && afterAuthToOnboarding) {
      if (router.canGoBack()) router.back();
      else router.replace('/(intake)/sign-in' as Href);
      return;
    }
    if (step === 'code') {
      setStep('email');
      setCode('');
      setVerified(false);
      setFormError(null);
      return;
    }
    if (afterAuthToOnboarding) {
      if (router.canGoBack()) router.back();
      else router.replace('/(intake)/sign-in' as Href);
      return;
    }
    router.back();
  }, [afterAuthToOnboarding, step]);

  const resendDisabled = busy || resendIn > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.back}>Back</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>
        {step === 'code' ? 'Check your inbox' : afterAuthToOnboarding ? 'Use email' : 'Enter your email'}
      </Text>
      <Text style={styles.sub}>
        {step === 'email'
          ? 'We will email you a 6-digit code. No password.'
          : `We sent a 6-digit code to ${email}.`}
      </Text>
      {step === 'code' ? <Text style={styles.spam}>Check spam just in case.</Text> : null}

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

      {formError ? (
        formError.caption ? (
          <View
            style={[
              styles.messageCard,
              formError.variant === 'notice' ? styles.messageCardNotice : styles.messageCardError,
            ]}>
            <Text
              style={[
                styles.messageTitle,
                formError.variant === 'notice' ? styles.messageTitleNotice : styles.messageTitleError,
              ]}>
              {formError.message}
            </Text>
            <Text style={styles.messageCaption}>{formError.caption}</Text>
          </View>
        ) : (
          <Text style={styles.error}>{formError.message}</Text>
        )
      ) : null}

      <Pressable
        style={[styles.primary, (busy || !supabaseConfigured) && styles.primaryDisabled]}
        onPress={() => void (step === 'email' ? onSendCode() : onVerify())}
        disabled={busy || !supabaseConfigured}>
        {busy ? (
          <AppLoadingCross size="small" />
        ) : (
          <Text style={styles.primaryTxt}>
            {step === 'email' ? 'Send code' : verified ? 'Continue' : 'Verify & continue'}
          </Text>
        )}
      </Pressable>

      {step === 'code' ? (
        <Pressable
          style={styles.resend}
          onPress={() => void onSendCode()}
          disabled={resendDisabled}
          accessibilityRole="button"
          accessibilityLabel={resendIn > 0 ? `Resend code in ${resendIn} seconds` : 'Resend code'}>
          <Text style={[styles.resendTxt, resendDisabled && styles.resendDisabled]}>
            {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
          </Text>
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
  spam: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.onSurfaceVariant,
    marginTop: -16,
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
    borderRadius: theme.radii.md,
  },
  error: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.error,
    marginBottom: 12,
    lineHeight: 20,
  },
  messageCard: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    borderRadius: theme.radii.md,
  },
  messageCardNotice: {
    borderColor: 'rgba(255, 215, 0, 0.35)',
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  messageCardError: {
    borderColor: 'rgba(255, 180, 171, 0.35)',
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  messageTitle: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  messageTitleNotice: {
    color: theme.colors.onBackground,
  },
  messageTitleError: {
    color: theme.colors.error,
  },
  messageCaption: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
  },
  primary: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    borderRadius: theme.radii.full,
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
  resendDisabled: { opacity: 0.4 },
});
