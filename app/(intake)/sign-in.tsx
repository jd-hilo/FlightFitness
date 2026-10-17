import { Redirect, router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { backOrReplace } from '@/components/onboarding/backOrReplace';
import { finishAuthAndRoute } from '@/components/onboarding/enterOnboarding';
import { theme } from '@/constants/theme';
import {
  getAppleAuthenticationModule,
  isAppleSignInAvailable,
  signInWithApple,
  type AppleAuthenticationModule,
} from '@/lib/appleSignIn';
import {
  FLIGHT_FITNESS_PRIVACY_POLICY_URL,
  FLIGHT_FITNESS_TERMS_OF_SERVICE_URL,
} from '@/lib/legalUrls';
import { supabaseConfigured } from '@/lib/supabase';
import { useRegisteredAuth } from '@/lib/useRegisteredAuth';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function IntakeSignInScreen() {
  const insets = useSafeAreaInsets();
  const { ready, registered } = useRegisteredAuth();
  const completed = useOnboardingStore((s) => s.completedAt != null);
  const [apple, setApple] = useState<AppleAuthenticationModule | null>(null);
  const [appleReady, setAppleReady] = useState(false);
  const [appleWidth, setAppleWidth] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const available = await isAppleSignInAvailable();
      if (cancelled) return;
      setApple(available ? getAppleAuthenticationModule() : null);
      setAppleReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goEmail = () => {
    router.push('/email-sign-in?next=onboarding' as Href);
  };

  const continueSignedIn = async (givenName?: string) => {
    const res = await finishAuthAndRoute(givenName);
    if (!res.ok) setError(res.error);
  };

  const onApple = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signInWithApple();
      if (!res.ok) {
        if (!res.cancelled) setError(res.error);
        return;
      }
      await continueSignedIn(res.givenName);
    } finally {
      setBusy(false);
    }
  };

  const onContinue = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await continueSignedIn();
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <View style={styles.center}>
        <AppLoadingCross size="large" />
      </View>
    );
  }

  if (registered && completed) {
    return <Redirect href={'/' as Href} />;
  }

  const AppleButton = apple?.AppleAuthenticationButton ?? null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <Pressable
        onPress={() => backOrReplace('/(intake)/proof' as Href)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Back">
        <Text style={styles.back}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Save your progress</Text>
      <Text style={styles.sub}>Continue with Apple, or use your email. No password.</Text>

      {!supabaseConfigured ? (
        <Text style={styles.warn}>
          Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to sign in.
        </Text>
      ) : null}

      <View style={styles.spacer} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {registered ? (
        <Pressable
          style={[styles.primary, busy && styles.primaryDisabled]}
          disabled={busy || !supabaseConfigured}
          onPress={() => void onContinue()}
          accessibilityRole="button"
          accessibilityLabel="Continue">
          {busy ? <AppLoadingCross size="small" /> : <Text style={styles.primaryTxt}>Continue</Text>}
        </Pressable>
      ) : (
        <>
          {!appleReady ? (
            <View style={styles.appleLoading}>
              <AppLoadingCross size="small" />
            </View>
          ) : null}

          {apple && AppleButton ? (
            <View
              style={styles.appleSlot}
              onLayout={(event) => {
                const width = Math.round(event.nativeEvent.layout.width);
                if (width > 0 && width !== appleWidth) setAppleWidth(width);
              }}>
              {appleWidth > 0 ? (
                <AppleButton
                  buttonType={apple.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={apple.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={0}
                  style={{ width: appleWidth, height: 52 }}
                  onPress={() => void onApple()}
                />
              ) : null}
            </View>
          ) : null}

          {appleReady && !AppleButton ? (
            <>
              <Text style={styles.note}>Apple sign-in is not available on this device.</Text>
              <Pressable
                style={[styles.primary, (busy || !supabaseConfigured) && styles.primaryDisabled]}
                disabled={busy || !supabaseConfigured}
                onPress={goEmail}
                accessibilityRole="button"
                accessibilityLabel="Continue with email">
                <Text style={styles.primaryTxt}>Continue with email</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={goEmail}
              disabled={!supabaseConfigured}
              style={styles.emailLink}
              accessibilityRole="button"
              accessibilityLabel="Use email instead">
              <Text style={styles.emailLinkTxt}>Use email instead</Text>
            </Pressable>
          )}
        </>
      )}

      {busy && AppleButton ? <Text style={styles.note}>Signing in…</Text> : null}

      <Text style={styles.terms}>
        By using Flight Fitness, you agree to our{' '}
        <Text
          style={styles.termsLink}
          accessibilityRole="link"
          onPress={() => void WebBrowser.openBrowserAsync(FLIGHT_FITNESS_TERMS_OF_SERVICE_URL)}>
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text
          style={styles.termsLink}
          accessibilityRole="link"
          onPress={() => void WebBrowser.openBrowserAsync(FLIGHT_FITNESS_PRIVACY_POLICY_URL)}>
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.gold,
    marginBottom: 28,
  },
  title: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 28,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sub: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.onSurfaceVariant,
  },
  spacer: { flex: 1 },
  warn: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.error,
    marginTop: 16,
  },
  error: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.error,
    marginBottom: 12,
  },
  note: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 12,
  },
  appleLoading: {
    alignItems: 'center',
    marginBottom: 16,
  },
  appleSlot: {
    width: '100%',
    minHeight: 52,
    marginBottom: 4,
  },
  primary: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 17,
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
  emailLink: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emailLinkTxt: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.gold,
  },
  terms: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
  },
  termsLink: {
    color: theme.colors.gold,
    textDecorationLine: 'underline',
  },
});
