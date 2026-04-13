import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { generateWeekPlan } from '@/lib/api/plan';
import { buildMockWeekPlan } from '@/lib/mockPlan';
import { useCanGeneratePlan } from '@/stores/subscriptionStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export default function GenerateScreen() {
  const insets = useSafeAreaInsets();
  const answers = useOnboardingStore((s) => s.answers);
  const setFromWeekPlan = usePlanStore((s) => s.setFromWeekPlan);
  const tier = useSubscriptionStore((s) => s.tier);
  const markFreePlanUsed = useSubscriptionStore((s) => s.markFreePlanUsed);
  const canGen = useCanGeneratePlan();
  const [status, setStatus] = useState<'idle' | 'loading' | 'err'>('loading');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const skipOrDoneRef = useRef(false);

  useEffect(() => {
    skipOrDoneRef.current = false;

    if (!canGen) {
      setStatus('err');
      setMessage(
        'You have used your free AI plan. Upgrade to generate new weeks and unlock customization.'
      );
      return;
    }

    let cancelled = false;
    (async () => {
      setStatus('loading');
      const res = await generateWeekPlan({ onboarding: answers, action: 'full' });
      if (cancelled || skipOrDoneRef.current) return;
      if (!res.ok) {
        setStatus('err');
        setMessage(res.error);
        return;
      }
      skipOrDoneRef.current = true;
      setFromWeekPlan(res.plan);
      if (tier === 'free') markFreePlanUsed();
      router.replace('/(tabs)');
    })();

    return () => {
      cancelled = true;
    };
  }, [answers, attempt, canGen, markFreePlanUsed, setFromWeekPlan, tier]);

  const retry = () => setAttempt((a) => a + 1);

  const goPaywall = () => {
    router.push('/paywall');
  };

  /** Testing: skip wait / errors and open main tabs with a mock week (does not burn free plan). */
  const notNowToHome = () => {
    skipOrDoneRef.current = true;
    setFromWeekPlan(buildMockWeekPlan(answers));
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 48 }]}>
      <Text style={styles.title}>Building your week</Text>
      <Text style={styles.sub}>
        AI is creating meals, workouts, and your grocery list.
      </Text>
      {status === 'loading' && canGen ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.gold}
          style={{ marginTop: 40 }}
        />
      ) : null}
      {status === 'err' ? (
        <View style={styles.errBox}>
          <Text style={styles.err}>{message}</Text>
          {!canGen ? (
            <Pressable style={styles.btn} onPress={goPaywall}>
              <Text style={styles.btnTxt}>View plans</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.btn} onPress={retry}>
              <Text style={styles.btnTxt}>Retry</Text>
            </Pressable>
          )}
        </View>
      ) : null}
      <Pressable style={styles.notNow} onPress={notNowToHome} hitSlop={12}>
        <Text style={styles.notNowTxt}>Not now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
  },
  title: {
    fontFamily: theme.fonts.headline,
    fontSize: 32,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sub: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 22,
  },
  errBox: { marginTop: 32, gap: 16 },
  err: {
    fontFamily: theme.fonts.body,
    color: theme.colors.error,
    fontSize: 15,
  },
  btn: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
  },
  btnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
  },
  notNow: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingVertical: 24,
    alignItems: 'center',
  },
  notNowTxt: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
});
