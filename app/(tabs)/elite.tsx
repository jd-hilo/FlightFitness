import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { WeightProgressChart } from '@/components/home/WeightProgressChart';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ProfileUpgradeBanner } from '@/components/profile/ProfileUpgradeBanner';
import { RestTimerSoundPicker } from '@/components/profile/RestTimerSoundPicker';
import { RestVerseModePicker } from '@/components/profile/RestVerseModePicker';
import { SessionMinutesChart } from '@/components/tracking/SessionMinutesChart';
import { WeeklyHabitChart } from '@/components/tracking/WeeklyHabitChart';
import { theme } from '@/constants/theme';
import { deleteAccount } from '@/lib/api/deleteAccount';
import { generateWeekPlan } from '@/lib/api/plan';
import { paywallHref, trackPlanGenerated } from '@/lib/analytics';
import { isAiWeekPlanEnabled } from '@/lib/featureFlags';
import {
  CC_BY_SA_4_LICENSE_URL,
  WGER_EXERCISE_DATA_URL,
} from '@/lib/legalUrls';
import {
  buildLast7DayHabitScores,
  buildLast7DaySessionMinutes,
} from '@/lib/trackingWeekScores';
import { buildWeightChartEntries } from '@/lib/weightChartEntries';
import { presentRevenueCatCustomerCenter } from '@/lib/revenueCat';
import { resetLocalAppStateForSignOut } from '@/lib/signOutReset';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import { useCompletionStore } from '@/stores/completionStore';
import { useFaithDailyStore } from '@/stores/faithDailyStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useWeightLogStore } from '@/stores/weightLogStore';
import { useWorkoutSessionLogStore } from '@/stores/workoutSessionLogStore';

export default function EliteScreen() {
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [regeneratingPlan, setRegeneratingPlan] = useState(false);

  const tier = useSubscriptionStore((s) => s.tier);
  const firstName = useOnboardingStore((s) => s.answers.firstName.trim());
  const onboardingWeight = useOnboardingStore((s) => s.answers.currentWeightLb);
  const targetWeight = useOnboardingStore((s) => s.answers.targetWeightLb);
  const answers = useOnboardingStore((s) => s.answers);
  const setFromWeekPlan = usePlanStore((s) => s.setFromWeekPlan);
  const weekStart = usePlanStore((s) => s.weekStart);
  const mealsByDay = usePlanStore((s) => s.mealsByDay);
  const workoutsByDay = usePlanStore((s) => s.workoutsByDay);

  const trainingStreak = useCompletionStore((s) => s.streak);
  const completionByDay = useCompletionStore((s) => s.byDay);
  const faithStreak = useFaithDailyStore((s) => s.faithStreak);
  const faithByDay = useFaithDailyStore((s) => s.byDay);

  const weightEntries = useWeightLogStore((s) => s.entries);
  const sessions = useWorkoutSessionLogStore((s) => s.sessions);

  const chartEntries = useMemo(
    () => buildWeightChartEntries(weightEntries, onboardingWeight),
    [weightEntries, onboardingWeight]
  );

  const latestWeight =
    weightEntries.length > 0
      ? [...weightEntries].sort((a, b) => a.dateKey.localeCompare(b.dateKey)).at(-1)
          ?.weightLb ?? onboardingWeight
      : onboardingWeight;

  const habitDays = useMemo(
    () =>
      buildLast7DayHabitScores({
        completionByDay,
        faithByDay,
        planWeekStart: weekStart,
        mealsByDay,
        workoutsByDay,
      }),
    [completionByDay, faithByDay, weekStart, mealsByDay, workoutsByDay]
  );

  const sessionMinutes = useMemo(
    () => buildLast7DaySessionMinutes(sessions),
    [sessions]
  );

  const workoutsThisWeek = useMemo(
    () => habitDays.filter((d) => d.train >= 1).length,
    [habitDays]
  );

  const onSignOut = () => {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            resetLocalAppStateForSignOut();
            if (supabase) {
              await supabase.auth.signOut({ scope: 'local' });
            }
          } finally {
            setSigningOut(false);
            router.replace('/welcome' as Href);
          }
        },
      },
    ]);
  };

  const onDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and cloud data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeletingAccount(true);
              const res = await deleteAccount();
              setDeletingAccount(false);
              if (!res.ok) {
                Alert.alert('Could not delete account', res.error);
                return;
              }
              resetLocalAppStateForSignOut();
              if (supabase) await supabase.auth.signOut({ scope: 'local' });
              router.replace('/welcome' as Href);
            })();
          },
        },
      ]
    );
  }, []);

  const onManagePlan = useCallback(() => {
    if (tier === 'free') {
      router.push(paywallHref('elite'));
      return;
    }
    void (async () => {
      setManagingSubscription(true);
      try {
        await presentRevenueCatCustomerCenter();
      } catch (error) {
        Alert.alert(
          'Subscriptions',
          error instanceof Error ? error.message : 'Try again shortly.'
        );
      } finally {
        setManagingSubscription(false);
      }
    })();
  }, [tier]);

  const onDevRegeneratePlan = useCallback(() => {
    Alert.alert('Regenerate week?', 'Dev only — replaces this week\'s plan.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate',
        onPress: () => {
          void (async () => {
            setRegeneratingPlan(true);
            const started = Date.now();
            const res = await generateWeekPlan({
              onboarding: answers,
              action: 'full',
              weekStartHint: viewWeekStartYmdLocal(),
            });
            trackPlanGenerated({
              source: 'regenerate',
              success: res.ok,
              durationMs: Date.now() - started,
              wasMock: res.ok ? Boolean(res.wasMock) : false,
            });
            setRegeneratingPlan(false);
            if (!res.ok) {
              Alert.alert('Failed', res.error);
              return;
            }
            setFromWeekPlan(res.plan);
          })();
        },
      },
    ]);
  }, [answers, setFromWeekPlan]);

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {firstName ? `${firstName}'s` : 'Your'} tracking
          </Text>
          <Pressable
            onPress={() => router.push('/profile-edit' as Href)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Edit profile">
            <MaterialIcons name="edit" size={22} color={theme.colors.gold} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{trainingStreak}</Text>
            <Text style={styles.statLabel}>Train streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{faithStreak}</Text>
            <Text style={styles.statLabel}>Faith streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{workoutsThisWeek}</Text>
            <Text style={styles.statLabel}>Workouts / 7d</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartKicker}>Weight</Text>
          <View style={styles.weightHead}>
            <Text style={styles.weightNow}>{latestWeight} lb</Text>
            {targetWeight > 0 ? (
              <Text style={styles.weightTarget}>→ {targetWeight} lb</Text>
            ) : null}
          </View>
          <WeightProgressChart
            entries={chartEntries}
            targetWeightLb={targetWeight > 0 ? targetWeight : undefined}
          />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartKicker}>7-day habits</Text>
          <WeeklyHabitChart days={habitDays} />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartKicker}>Training time</Text>
          <SessionMinutesChart points={sessionMinutes} />
          {sessionMinutes.every((p) => p.minutes === 0) ? (
            <Text style={styles.chartEmpty}>
              Finish a workout session to log minutes here.
            </Text>
          ) : null}
        </View>

        {__DEV__ && isAiWeekPlanEnabled() ? (
          <Pressable
            style={styles.devBtn}
            onPress={onDevRegeneratePlan}
            disabled={regeneratingPlan}>
            <Text style={styles.devBtnTxt}>
              {regeneratingPlan ? 'Regenerating…' : 'Dev: regenerate week'}
            </Text>
          </Pressable>
        ) : null}

        <RestTimerSoundPicker />
        <RestVerseModePicker />

        <ProfileUpgradeBanner
          tier={tier}
          onUpgrade={() => router.push(paywallHref('elite'))}
          onCoaching={() => router.push('/coaching-info')}
        />
        {tier !== 'free' ? (
          <Pressable
            style={styles.manageLink}
            onPress={onManagePlan}
            disabled={managingSubscription}
            hitSlop={8}>
            <Text style={styles.manageLinkTxt}>
              {managingSubscription ? 'Opening subscriptions…' : 'Manage subscription'}
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.attribution}>
          Exercise data from{' '}
          <Text
            style={styles.attributionLink}
            onPress={() => void WebBrowser.openBrowserAsync(WGER_EXERCISE_DATA_URL)}>
            wger.de
          </Text>
          ,{' '}
          <Text
            style={styles.attributionLink}
            onPress={() =>
              void WebBrowser.openBrowserAsync(CC_BY_SA_4_LICENSE_URL)
            }>
            CC-BY-SA 4.0
          </Text>
        </Text>

        <Pressable
          style={styles.signOutBtn}
          onPress={onSignOut}
          disabled={signingOut || deletingAccount}>
          <Text style={styles.signOutTxt}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onDeleteAccount}
          disabled={signingOut || deletingAccount}
          hitSlop={8}>
          <Text style={styles.deleteTxt}>
            {deletingAccount ? 'Deleting…' : 'Delete account'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 22,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
  },
  statVal: {
    fontFamily: theme.fonts.headline,
    fontSize: 22,
    color: theme.colors.gold,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 8,
    letterSpacing: 0.8,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  chartCard: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 16,
    marginBottom: 16,
  },
  chartKicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  chartEmpty: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 19,
  },
  weightHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 8,
  },
  weightNow: {
    fontFamily: theme.fonts.headline,
    fontSize: 28,
    color: theme.colors.onBackground,
  },
  weightTarget: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  manageLink: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 16,
  },
  manageLinkTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    textDecorationLine: 'underline',
  },
  devBtn: {
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  devBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  signOutTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.error,
    textTransform: 'uppercase',
  },
  deleteTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 24,
  },
  attribution: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 20,
  },
  attributionLink: {
    color: theme.colors.gold,
    textDecorationLine: 'underline',
  },
});
