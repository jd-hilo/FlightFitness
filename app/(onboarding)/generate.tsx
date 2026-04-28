import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlanGeneratingModal } from '@/components/PlanGeneratingModal';
import { theme } from '@/constants/theme';
import { useStoresHydrated } from '@/lib/hydration';
import { generateWeekPlan } from '@/lib/api/plan';
import { buildMockWeekPlan } from '@/lib/mockPlan';
import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export default function GenerateScreen() {
  const insets = useSafeAreaInsets();
  const hydrated = useStoresHydrated();
  const setFromWeekPlan = usePlanStore((s) => s.setFromWeekPlan);
  const [status, setStatus] = useState<'idle' | 'loading' | 'err'>('loading');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const skipOrDoneRef = useRef(false);
  const genRunIdRef = useRef(0);

  useEffect(() => {
    if (!hydrated) return;

    if (useSubscriptionStore.getState().tier === 'coaching') {
      router.replace('/(tabs)' as Href);
      return;
    }

    skipOrDoneRef.current = false;
    const answers = useOnboardingStore.getState().answers;
    const runId = ++genRunIdRef.current;

    let cancelled = false;
    (async () => {
      try {
        setStatus('loading');
        if (__DEV__) {
          console.log('[GenerateScreen] generateWeekPlan (full) run', runId);
        }
        const res = await generateWeekPlan({
          onboarding: answers,
          action: 'full',
          weekStartHint: viewWeekStartYmdLocal(),
        });
        if (cancelled || skipOrDoneRef.current) return;
        if (runId !== genRunIdRef.current) return;
        if (!res.ok) {
          setStatus('err');
          setMessage(res.error);
          return;
        }
        skipOrDoneRef.current = true;
        setFromWeekPlan(res.plan);
        useSubscriptionStore.getState().consumeFreeAiWeekAfterFullGenerateIfNeeded();
        router.replace('/(tabs)');
      } catch (e) {
        if (cancelled || skipOrDoneRef.current) return;
        if (runId !== genRunIdRef.current) return;
        const msg = e instanceof Error ? e.message : String(e);
        const offline =
          msg.includes('Network request failed') || msg.includes('Failed to fetch');
        setStatus('err');
        setMessage(
          offline
            ? 'No network connection. Connect to Wi‑Fi or cellular, then tap Retry.'
            : 'Something went wrong. Tap Retry.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, attempt, setFromWeekPlan]);

  const retry = () => setAttempt((a) => a + 1);

  const continueWithSampleWeek = () => {
    skipOrDoneRef.current = true;
    const answers = useOnboardingStore.getState().answers;
    setFromWeekPlan(buildMockWeekPlan(answers));
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 48 }]}>
      <PlanGeneratingModal
        visible={status === 'loading'}
        onUseSampleWeek={continueWithSampleWeek}
      />
      {status === 'err' ? (
        <View style={styles.errBox}>
          <Text style={styles.title}>Couldn’t build your week</Text>
          <Text style={styles.err}>{message}</Text>
          <Pressable style={styles.btn} onPress={retry}>
            <Text style={styles.btnTxt}>Retry</Text>
          </Pressable>
          <Pressable style={styles.sampleErrBtn} onPress={continueWithSampleWeek}>
            <Text style={styles.sampleErrBtnTxt}>Continue with sample week</Text>
          </Pressable>
        </View>
      ) : null}
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
    fontSize: 26,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  errBox: { marginTop: 24, gap: 16, flex: 1 },
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
  sampleErrBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sampleErrBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
});
