import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
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
import { supabaseConfigured } from '@/lib/supabase';
import { useRegisteredAuth } from '@/lib/useRegisteredAuth';

const SLIDES = [
  {
    key: 'brand',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    image: require('../assets/images/onboarding/3d-brand.jpg') as number,
    kicker: 'Flight Fitness',
    title: 'Where faith\nmeets function',
    body: 'Train your body and stay in the Word, in the same session.',
  },
  {
    key: 'train',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    image: require('../assets/images/onboarding/3d-train.jpg') as number,
    kicker: 'Train',
    title: 'Log every set',
    body: 'The next session starts from what you actually lifted.',
  },
  {
    key: 'faith',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    image: require('../assets/images/onboarding/3d-faith.jpg') as number,
    kicker: 'Faith',
    title: 'Verse while you rest',
    body: 'A verse between sets, and time in Scripture when you leave the gym.',
  },
  {
    key: 'progress',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    image: require('../assets/images/onboarding/3d-progress.jpg') as number,
    kicker: 'Progress',
    title: 'Streaks, side by side',
    body: 'Training and faith streaks tracked together.',
  },
] as const;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { ready, registered } = useRegisteredAuth();
  const [index, setIndex] = useState(0);
  const [appleReady, setAppleReady] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Gentle floating bob for 3D art
  const bobAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [bobAnim]);
  const bobY = bobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

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

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const goEmail = () => {
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
      const next = await finishAuthAndRoute(res.givenName);
      if (!next.ok) setError(next.error);
    } finally {
      setBusy(false);
    }
  };

  if (ready && registered) {
    return <Redirect href={'/' as Href} />;
  }

  const imgSize = Math.round(width * 0.72);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 8 }]}>
      <Animated.FlatList
        style={styles.list}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item, index: i }) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const rotateY = scrollX.interpolate({
            inputRange,
            outputRange: ['40deg', '0deg', '-40deg'],
            extrapolate: 'clamp',
          });
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.78, 1, 0.78],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            <View style={[styles.slide, { width }]}>
              <Text style={styles.kicker}>{item.kicker}</Text>
              <Animated.Image
                source={item.image}
                style={[
                  styles.heroImage,
                  { width: imgSize, height: imgSize, opacity },
                  {
                    transform: [{ perspective: 900 }, { translateY: bobY }, { rotateY }, { scale }],
                  },
                ]}
                resizeMode="contain"
              />
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideBody}>{item.body}</Text>
            </View>
          );
        }}
      />

      {/* Pill indicators */}
      <View style={styles.indicators} accessibilityRole="tablist">
        {SLIDES.map((slide, i) => (
          <View key={slide.key} style={[styles.indicator, i === index && styles.indicatorActive]} />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!appleReady ? (
        <View style={styles.appleLoading}>
          <AppLoadingCross size="small" />
        </View>
      ) : appleAvailable ? (
        <Pressable
          style={({ pressed }) => [styles.appleBtn, (busy || pressed) && styles.pressed]}
          disabled={busy || !ready || !supabaseConfigured}
          onPress={() => void onApple()}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple">
          {busy ? (
            <AppLoadingCross size="small" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={18} color="#000000" />
              <Text style={styles.appleTxt}>Continue with Apple</Text>
            </>
          )}
        </Pressable>
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

      {appleAvailable ? (
        <Pressable
          onPress={goEmail}
          disabled={!supabaseConfigured || busy}
          style={styles.emailLink}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    flex: 1,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  heroImage: {
    marginBottom: 22,
  },
  slideTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: theme.colors.onBackground,
    textAlign: 'center',
    marginBottom: 10,
  },
  slideBody: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  indicatorActive: {
    width: 22,
    backgroundColor: theme.colors.champagne,
  },
  error: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 28,
  },
  appleLoading: {
    alignItems: 'center',
    marginBottom: 16,
  },
  appleBtn: {
    marginHorizontal: 16,
    backgroundColor: theme.colors.onBackground,
    borderRadius: theme.radii.full,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: { opacity: 0.85 },
  appleTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: '#000000',
  },
  emailLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  emailTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 15,
    color: theme.colors.champagne,
  },
  terms: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 4,
    marginBottom: 4,
  },
  termsLink: {
    color: theme.colors.champagne,
    textDecorationLine: 'underline',
  },
});
