import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { sunriseImage } from '@/components/SunriseBackdrop';
import { theme } from '@/constants/theme';
import { displayAppName } from '@/lib/screenshotMode';
import {
  requestDevotionalPermission,
  syncDailyDevotionalNotifications,
  trackDevotionalChoice,
  trackDevotionalPermission,
} from '@/lib/devotionalNotifications';
import { getDailyFaithReading } from '@/lib/faithReadings';
import { useDevotionalNotificationStore } from '@/stores/devotionalNotificationStore';

const appIcon = require('../assets/images/icon.png');
const SHOW_DELAY_MS = 3000;

/**
 * Shown the first time someone opens Faith, after a short pause.
 * Yes continues into the system notification permission sheet.
 */
export function DailyDevotionalPrompt() {
  const asked = useDevotionalNotificationStore((s) => s.asked);
  const [hydrated, setHydrated] = useState(() =>
    useDevotionalNotificationStore.persist.hasHydrated()
  );
  const [ready, setReady] = useState(false);
  const reading = getDailyFaithReading();

  useEffect(() => {
    if (useDevotionalNotificationStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useDevotionalNotificationStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !hydrated || asked) return;
    const timer = setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hydrated, asked]);

  if (Platform.OS === 'web' || !ready || asked) return null;

  const onNo = () => {
    useDevotionalNotificationStore.getState().decline();
    trackDevotionalChoice('no');
    void syncDailyDevotionalNotifications();
  };

  const onYes = () => {
    useDevotionalNotificationStore.getState().accept();
    trackDevotionalChoice('yes');
    setTimeout(() => {
      void (async () => {
        const granted = await requestDevotionalPermission();
        trackDevotionalPermission(granted);
        if (granted) await syncDailyDevotionalNotifications();
      })();
    }, 350);
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onNo}>
      <PromptCard readingTitle={reading.title} readingBody={reading.passage} onYes={onYes} onNo={onNo} />
    </Modal>
  );
}

function PromptCard({
  readingTitle,
  readingBody,
  onYes,
  onNo,
}: {
  readingTitle: string;
  readingBody: string;
  onYes: () => void;
  onNo: () => void;
}) {
  const appear = useSharedValue(0);
  const note = useSharedValue(0);

  useEffect(() => {
    appear.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    note.value = withDelay(
      520,
      withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) })
    );
  }, [appear, note]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: appear.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: 0.96 + appear.value * 0.04 }],
  }));
  const noteStyle = useAnimatedStyle(() => ({
    opacity: note.value,
    transform: [{ translateY: (1 - note.value) * -120 }],
  }));

  return (
    <Animated.View style={[styles.backdrop, backdropStyle]} accessibilityViewIsModal>
      <Pressable style={styles.touchOut} onPress={onNo} accessibilityLabel="Not now" />
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.phone}>
          <View style={styles.screen}>
            <Image source={sunriseImage} resizeMode="cover" style={styles.wallpaper} />
            <LinearGradient
              colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.island} />
            <Text style={styles.clock}>9:00</Text>
            <Animated.View style={[styles.note, noteStyle]}>
              <Image source={appIcon} style={styles.noteIcon} />
              <View style={styles.noteText}>
                <View style={styles.noteTop}>
                  <Text style={styles.noteApp} numberOfLines={1}>
                    {displayAppName()}
                  </Text>
                  <Text style={styles.noteTime}>now</Text>
                </View>
                <Text style={styles.noteTitle} numberOfLines={1}>
                  {readingTitle}
                </Text>
                <Text style={styles.noteBody} numberOfLines={2}>
                  {readingBody}
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>

        <Text style={styles.title}>
          Do you want to receive a daily devotional to your home screen?
        </Text>
        <Pressable style={styles.primary} onPress={onYes} accessibilityRole="button">
          <Text style={styles.primaryTxt}>Yes</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onNo} accessibilityRole="button">
          <Text style={styles.secondaryTxt}>Not now</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  touchOut: { ...StyleSheet.absoluteFillObject },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(235,213,174,0.35)',
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  phone: {
    alignSelf: 'center',
    width: 196,
    height: 248,
    borderRadius: 32,
    padding: 7,
    backgroundColor: '#1A1A1C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    marginBottom: 22,
  },
  screen: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  wallpaper: {
    position: 'absolute',
    width: 280,
    height: 280 * (1024 / 472),
    left: -40,
    top: -120,
  },
  island: {
    alignSelf: 'center',
    marginTop: 8,
    width: 62,
    height: 16,
    borderRadius: 10,
    backgroundColor: '#000',
  },
  clock: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: theme.fonts.headlineBold,
    fontSize: 34,
    letterSpacing: -1,
    color: '#FFFFFF',
  },
  note: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 108,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  noteIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    marginTop: 2,
  },
  noteText: { flex: 1, minWidth: 0 },
  noteTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  noteApp: {
    flex: 1,
    fontFamily: theme.fonts.labelBold,
    fontSize: 11,
    color: '#3A3A3C',
  },
  noteTime: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: '#8E8E93',
  },
  noteTitle: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 13,
    color: '#111',
    marginTop: 1,
  },
  noteBody: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: '#3A3A3C',
    marginTop: 1,
  },
  title: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  primary: {
    backgroundColor: theme.colors.champagne,
    borderRadius: theme.radii.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: theme.colors.onChampagne,
  },
  secondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  secondaryTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
  },
});
