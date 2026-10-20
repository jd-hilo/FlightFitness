import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { theme } from '@/constants/theme';
import {
  getAppleAuthenticationModule,
  isAppleSignInAvailable,
} from '@/lib/appleSignIn';
import { displayAppName, isScreenshotMode } from '@/lib/screenshotMode';

/** Production keeps the welcome slideshow. Screenshot mode renders Apple sign-in. */
export default function IntakeSignInScreen() {
  const insets = useSafeAreaInsets();
  const [appleReady, setAppleReady] = useState(isScreenshotMode);
  const [appleAvailable, setAppleAvailable] = useState(isScreenshotMode);

  useEffect(() => {
    if (isScreenshotMode) {
      setAppleAvailable(true);
      setAppleReady(true);
      return;
    }
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

  if (!isScreenshotMode) {
    return <Redirect href={'/welcome' as Href} />;
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.kicker}>{displayAppName()}</Text>
      <Text style={styles.title}>Sign in to continue</Text>
      <Text style={styles.body}>Train your body and stay in the Word, in the same session.</Text>

      {!appleReady ? (
        <View style={styles.appleLoading}>
          <AppLoadingCross size="small" />
        </View>
      ) : (
        <Pressable
          style={styles.appleBtn}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Apple">
          <Ionicons name="logo-apple" size={18} color="#000000" />
          <Text style={styles.appleTxt}>
            {appleAvailable ? 'Sign in with Apple' : 'Continue with email'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 28,
    letterSpacing: -0.5,
    color: theme.colors.onBackground,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 36,
  },
  appleLoading: {
    alignItems: 'center',
  },
  appleBtn: {
    backgroundColor: theme.colors.onBackground,
    borderRadius: theme.radii.full,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appleTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: '#000000',
  },
});
