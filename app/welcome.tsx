import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useFocusEffect, type Href } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { finishAuthAndRoute } from '@/components/onboarding/enterOnboarding';
import { theme } from '@/constants/theme';
import {
  getAppleAuthenticationModule,
  isAppleSignInAvailable,
  signInWithApple,
} from '@/lib/appleSignIn';
import {
  FLIGHT_FITNESS_PRIVACY_POLICY_URL,
  FLIGHT_FITNESS_TERMS_OF_SERVICE_URL,
} from '@/lib/legalUrls';
import { hapticImpact, ImpactStyle } from '@/lib/haptics';
import { supabaseConfigured } from '@/lib/supabase';
import { useRegisteredAuth } from '@/lib/useRegisteredAuth';

const FF_MARK = require('../assets/images/ff-mark.png');
const FF_MARK_ASPECT = 817 / 662;
const MARK_WIDTH = 132;
const BUTTON_HEIGHT = 54;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { ready, registered } = useRegisteredAuth();
  const [appleReady, setAppleReady] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(1.12)).current;
  const helloOpacity = useRef(new Animated.Value(0)).current;
  const helloY = useRef(new Animated.Value(14)).current;
  const restOpacity = useRef(new Animated.Value(0)).current;
  const restY = useRef(new Animated.Value(16)).current;
  const [authLive, setAuthLive] = useState(false);
  const [markLoaded, setMarkLoaded] = useState(false);

  useEffect(() => {
    const fallback = setTimeout(() => setMarkLoaded(true), 1500);
    return () => clearTimeout(fallback);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      return () => setStatusBarStyle('light');
    }, []),
  );

  useEffect(() => {
    const backdrop = Animated.parallel([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bgScale, {
        toValue: 1,
        duration: 9000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    backdrop.start();
    return () => backdrop.stop();
  }, [bgOpacity, bgScale]);

  useEffect(() => {
    if (!markLoaded) return;
    const fade = (opacity: Animated.Value, translate: Animated.Value, duration: number) =>
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

    const intro = Animated.sequence([
      Animated.delay(250),
      fade(helloOpacity, helloY, 900),
      Animated.delay(300),
    ]);
    let rest: Animated.CompositeAnimation | null = null;
    intro.start(({ finished }) => {
      if (!finished) return;
      setAuthLive(true);
      rest = fade(restOpacity, restY, 1000);
      rest.start();
    });
    return () => {
      intro.stop();
      rest?.stop();
    };
  }, [markLoaded, helloOpacity, helloY, restOpacity, restY]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const available = await isAppleSignInAvailable();
      if (cancelled) return;
      setAppleAvailable(available && getAppleAuthenticationModule() != null);
      setAppleReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goEmail = () => {
    hapticImpact(ImpactStyle.Light);
    router.push('/email-sign-in?next=onboarding' as Href);
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
      hapticImpact(ImpactStyle.Light);
      const next = await finishAuthAndRoute(res.givenName);
      if (!next.ok) setError(next.error);
    } finally {
      setBusy(false);
    }
  };

  if (ready && registered) {
    return <Redirect href={'/' as Href} />;
  }

  const appleModule = appleAvailable ? getAppleAuthenticationModule() : null;
  const AppleButton = appleModule?.AppleAuthenticationButton ?? null;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#A9B3BD', '#C3CBD2', '#DDE1E5', '#EEF0F2']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.streaks, { opacity: bgOpacity, transform: [{ scale: bgScale }, { rotate: '-14deg' }] }]}
        pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
          style={[styles.streak, { top: '12%', height: 140 }]}
        />
        <LinearGradient
          colors={['rgba(120,132,144,0)', 'rgba(120,132,144,0.18)', 'rgba(120,132,144,0)']}
          style={[styles.streak, { top: '28%', height: 90 }]}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          style={[styles.streak, { top: '58%', height: 180 }]}
        />
        <LinearGradient
          colors={['rgba(120,132,144,0)', 'rgba(120,132,144,0.12)', 'rgba(120,132,144,0)']}
          style={[styles.streak, { top: '76%', height: 110 }]}
        />
      </Animated.View>

      <View
        style={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.hero} pointerEvents="none">
          <Animated.View
            style={[styles.heroInner, { opacity: helloOpacity, transform: [{ translateY: helloY }] }]}>
            <Image
              source={FF_MARK}
              style={styles.mark}
              resizeMode="contain"
              fadeDuration={0}
              onLoad={() => setMarkLoaded(true)}
              accessibilityLabel="Fortify"
            />
            <Text style={styles.headline}>
              Your new era of physical and spiritual health
            </Text>
          </Animated.View>
        </View>

        <Animated.View
          style={{ opacity: restOpacity, transform: [{ translateY: restY }] }}
          collapsable={false}
          pointerEvents={authLive ? 'auto' : 'none'}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!appleReady ? (
            <View style={styles.appleLoading}>
              <AppLoadingCross size="small" color="#3A3F45" />
            </View>
          ) : AppleButton && appleModule ? (
            <View
              style={styles.appleWrap}
              pointerEvents={busy || !ready || !supabaseConfigured ? 'none' : 'auto'}>
              <AppleButton
                buttonType={appleModule.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={appleModule.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={BUTTON_HEIGHT / 2}
                style={[
                  styles.appleNative,
                  (busy || !ready || !supabaseConfigured) && styles.pressed,
                ]}
                onPress={() => void onApple()}
              />
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.appleBtn, (busy || pressed) && styles.pressed]}
              disabled={!ready || !supabaseConfigured}
              onPress={goEmail}
              accessibilityRole="button"
              accessibilityLabel="Continue with email">
              <Text style={styles.appleTxt}>Continue with email</Text>
            </Pressable>
          )}

          {AppleButton ? (
            <Pressable
              onPress={goEmail}
              disabled={!supabaseConfigured || busy}
              style={styles.emailLink}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Use email instead">
              <Text style={styles.emailTxt}>Use email instead</Text>
            </Pressable>
          ) : null}

          {!supabaseConfigured ? (
            <Text style={styles.error}>Sign-in is not configured on this build.</Text>
          ) : null}

          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.termsLink}
              onPress={() => void WebBrowser.openBrowserAsync(FLIGHT_FITNESS_TERMS_OF_SERVICE_URL)}>
              Terms
            </Text>{' '}
            and{' '}
            <Text
              style={styles.termsLink}
              onPress={() => void WebBrowser.openBrowserAsync(FLIGHT_FITNESS_PRIVACY_POLICY_URL)}>
              Privacy Policy
            </Text>
            .
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#C3CBD2',
    overflow: 'hidden',
  },
  streaks: {
    position: 'absolute',
    top: '-25%',
    bottom: '-25%',
    left: '-40%',
    right: '-40%',
  },
  streak: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.space.screen,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  heroInner: {
    alignItems: 'center',
  },
  mark: {
    width: MARK_WIDTH,
    height: MARK_WIDTH / FF_MARK_ASPECT,
    opacity: 0.9,
    marginBottom: 28,
    shadowColor: '#5C6670',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  headline: {
    maxWidth: 320,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.9,
    color: '#9AA0A7',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.75)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 1,
  },
  error: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: '#B3261E',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  appleLoading: {
    alignItems: 'center',
    height: BUTTON_HEIGHT,
    justifyContent: 'center',
  },
  appleWrap: {
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_HEIGHT / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: '#000000',
    shadowColor: '#1C2228',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'visible',
  },
  appleNative: {
    flex: 1,
  },
  appleBtn: {
    backgroundColor: '#000000',
    borderRadius: BUTTON_HEIGHT / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    height: BUTTON_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1C2228',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  pressed: { opacity: 0.85 },
  appleTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 18,
    color: '#FFFFFF',
  },
  emailLink: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 6,
  },
  emailTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 15,
    color: '#3A3F45',
  },
  terms: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(58,63,69,0.6)',
    textAlign: 'center',
    paddingHorizontal: 28,
    marginTop: 8,
  },
  termsLink: {
    color: '#3A3F45',
    textDecorationLine: 'underline',
  },
});
