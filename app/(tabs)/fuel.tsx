import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { TabScreenHeading } from '@/components/TabScreenHeading';
import { MacroDashboard } from '@/components/plan/MacroDashboard';
import { MealCard } from '@/components/plan/MealCard';
import { WeekStrip } from '@/components/WeekStrip';
import { theme } from '@/constants/theme';
import { generateWeekPlan } from '@/lib/api/plan';
import { sumMacrosForMeals } from '@/lib/mealTotals';
import { getWeekPlanFromStore } from '@/lib/planFromStore';
import { dateKeyForPlanDay, planDayIndexForToday } from '@/lib/weekUtils';
import { getTriggerVerse } from '@/lib/verses';
import { normalizeDay, useCompletionStore } from '@/stores/completionStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { useUiStore } from '@/stores/uiStore';
import { useVerseModalStore } from '@/stores/verseModalStore';
import { useCanCustomize, useCanGeneratePlan } from '@/stores/subscriptionStore';

const FLIGHT_FOODS_PRE_WORKOUT =
  'https://flight-foods.com/collections/pre-workout';

const FLIGHT_FOODS_PRE_WORKOUT_PRODUCTS = [
  {
    name: 'Blessed Berry Pre-Workout',
    price: '$37.99',
    compareAt: '$44.99',
  },
  {
    name: 'Tunnel Vision Pre-Workout',
    detail: 'Clean focus & lasting energy',
    price: '$54.99',
    compareAt: '$59.99',
  },
  {
    name: 'Crusader Creamsicle Pre-Workout',
    price: '$37.99',
    compareAt: '$44.99',
    note: 'Ships 4/12',
  },
] as const;

export default function FuelScreen() {
  const insets = useSafeAreaInsets();
  const weekStart = usePlanStore((s) => s.weekStart);
  const macroTargets = usePlanStore((s) => s.macroTargets);
  const mealsByDay = usePlanStore((s) => s.mealsByDay);
  const answers = useOnboardingStore((s) => s.answers);
  const selectedPlanDay = useUiStore((s) => s.selectedPlanDay);
  const setSelectedPlanDay = useUiStore((s) => s.setSelectedPlanDay);
  const byDay = useCompletionStore((s) => s.byDay);
  const toggleMeal = useCompletionStore((s) => s.toggleMeal);
  const setFromWeekPlan = usePlanStore((s) => s.setFromWeekPlan);
  const showVerse = useVerseModalStore((s) => s.show);
  const canCustomize = useCanCustomize();
  const canGen = useCanGeneratePlan();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (weekStart) setSelectedPlanDay(planDayIndexForToday(weekStart));
  }, [weekStart, setSelectedPlanDay]);

  if (!weekStart || !macroTargets || !mealsByDay) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>No plan loaded.</Text>
      </View>
    );
  }

  const dateKey = dateKeyForPlanDay(weekStart, selectedPlanDay);
  const dayMeals = mealsByDay[selectedPlanDay] ?? [];
  const completion = normalizeDay(byDay[dateKey]);

  const logged = useMemo(() => {
    const done = dayMeals.filter((m) => completion.mealIds.includes(m.id));
    return sumMacrosForMeals(done);
  }, [dayMeals, completion.mealIds]);

  const onMealToggle = (mealId: string) => {
    const nowDone = toggleMeal(dateKey, mealId);
    if (nowDone) {
      const v = getTriggerVerse('gratitude', `${dateKey}-${mealId}-fuel`);
      showVerse(v, 'Give thanks — your body is a gift.');
    }
  };

  const runCustomize = async (
    action: Parameters<typeof generateWeekPlan>[0]['action'],
    extra?: Partial<Parameters<typeof generateWeekPlan>[0]>
  ) => {
    if (!canCustomize) {
      router.push('/paywall');
      return;
    }
    if (!canGen) {
      Alert.alert('Upgrade required', 'Unlock unlimited AI to customize your plan.');
      return;
    }
    const current = getWeekPlanFromStore();
    if (!current) return;
    setBusy(true);
    const res = await generateWeekPlan({
      onboarding: answers,
      action,
      currentPlan: current,
      ...extra,
    });
    setBusy(false);
    if (res.ok) setFromWeekPlan(res.plan);
    else Alert.alert('Request failed', res.error);
  };

  const onSwapMeal = (slot: string) => {
    runCustomize('swapMeal', {
      swapMeal: { dayIndex: selectedPlanDay, slot },
    });
  };

  const onRegenerateDay = () => {
    Alert.alert(
      'Regenerate day',
      'Replace today’s meals with a fresh AI set?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: () => runCustomize('regenerateDay', { regenerateDay: { dayIndex: selectedPlanDay } }),
        },
      ]
    );
  };

  const onAdjustMacros = () => {
    const t = macroTargets;
    runCustomize('adjustMacros', {
      adjustMacros: {
        calories: Math.round(t.calories * 1.05),
        proteinG: t.proteinG,
        carbsG: t.carbsG,
        fatG: t.fatG,
      },
    });
  };

  const openPreWorkoutCollection = useCallback(() => {
    WebBrowser.openBrowserAsync(FLIGHT_FOODS_PRE_WORKOUT).catch(() => {});
  }, []);

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}>
        <TabScreenHeading title="Fuel" />
        <WeekStrip
          weekStartYmd={weekStart}
          selectedIndex={selectedPlanDay}
          onSelect={setSelectedPlanDay}
        />
        <MacroDashboard
          targets={macroTargets}
          loggedKcal={logged.kcal}
          loggedProtein={logged.proteinG}
          loggedCarbs={logged.carbsG}
          loggedFat={logged.fatG}
        />
        <View style={styles.toolbar}>
          <Pressable style={styles.toolBtn} onPress={onRegenerateDay}>
            <Text style={styles.toolTxt}>Regenerate day</Text>
          </Pressable>
          <Pressable style={styles.toolBtn} onPress={onAdjustMacros}>
            <Text style={styles.toolTxt}>+5% calories</Text>
          </Pressable>
        </View>
        {busy ? (
          <ActivityIndicator color={theme.colors.gold} style={{ marginBottom: 16 }} />
        ) : null}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Daily log</Text>
          <Pressable onPress={() => router.push('/grocery')}>
            <Text style={styles.link}>Grocery</Text>
          </Pressable>
        </View>
        {dayMeals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            completed={completion.mealIds.includes(meal.id)}
            onToggleComplete={() => onMealToggle(meal.id)}
            onSwap={() => onSwapMeal(meal.slot)}
          />
        ))}
        <Text style={styles.energySectionTitle}>Energy</Text>
        <Text style={styles.energyLead}>
          Pre-workout picks from{' '}
          <Text style={styles.energyLeadEm}>Flight Foods</Text>
          . Tap a product to shop the collection.
        </Text>
        <View style={styles.energyCard}>
          {FLIGHT_FOODS_PRE_WORKOUT_PRODUCTS.map((p, i) => (
            <Pressable
              key={p.name}
              style={[
                styles.energyRow,
                i === FLIGHT_FOODS_PRE_WORKOUT_PRODUCTS.length - 1 &&
                  styles.energyRowLast,
              ]}
              onPress={openPreWorkoutCollection}>
              <MaterialIcons
                name="bolt"
                size={22}
                color={theme.colors.gold}
                style={styles.energyIcon}
              />
              <View style={styles.energyRowText}>
                <Text style={styles.energyName}>{p.name}</Text>
                {'detail' in p && p.detail != null ? (
                  <Text style={styles.energyDetail}>{p.detail}</Text>
                ) : null}
                {'note' in p && p.note != null ? (
                  <Text style={styles.energyNote}>{p.note}</Text>
                ) : null}
                <View style={styles.energyPriceRow}>
                  <Text style={styles.energyPrice}>{p.price}</Text>
                  <Text style={styles.energyCompareAt}>{p.compareAt}</Text>
                </View>
              </View>
              <MaterialIcons
                name="open-in-new"
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
            </Pressable>
          ))}
        </View>
        <View style={styles.tip}>
          <Text style={styles.tipTitle}>Hypertrophic timing</Text>
          <Text style={styles.tipBody}>
            Aim for ~30g protein within 45 minutes after hard training when possible.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  toolbar: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toolBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toolTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,215,0,0.3)',
  },
  sectionTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 28,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  energySectionTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 22,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 24,
  },
  energyLead: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 19,
    marginBottom: 12,
  },
  energyLeadEm: {
    fontFamily: theme.fonts.label,
    color: theme.colors.gold,
  },
  energyCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    marginBottom: 8,
    overflow: 'hidden',
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineStrong,
    gap: 12,
  },
  energyRowLast: {
    borderBottomWidth: 0,
  },
  energyIcon: {
    marginTop: 2,
  },
  energyRowText: {
    flex: 1,
    minWidth: 0,
  },
  energyName: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    lineHeight: 18,
  },
  energyDetail: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 16,
  },
  energyNote: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 0.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  energyPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 6,
  },
  energyPrice: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.gold,
  },
  energyCompareAt: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  tip: {
    marginTop: 24,
    marginBottom: 32,
    padding: 24,
    backgroundColor: theme.colors.gold,
    borderLeftWidth: 8,
    borderLeftColor: '#000',
  },
  tipTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 20,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tipBody: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onGold,
    lineHeight: 18,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  muted: {
    fontFamily: theme.fonts.body,
    color: theme.colors.onSurfaceVariant,
    padding: 24,
  },
});
