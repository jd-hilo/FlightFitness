import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { CoachChatHeaderButton } from '@/components/CoachChatHeaderButton';
import { PlanStripEmptyHint } from '@/components/PlanStripEmptyHint';
import { PlanUpgradeBadge } from '@/components/PlanUpgradeBadge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TabScreenHeading } from '@/components/TabScreenHeading';
import { MacroDashboard } from '@/components/plan/MacroDashboard';
import { EditMealModal } from '@/components/plan/EditMealModal';
import { MealCard } from '@/components/plan/MealCard';
import { WeekStrip } from '@/components/WeekStrip';
import { theme } from '@/constants/theme';
import { sumMacrosForMeals } from '@/lib/mealTotals';
import {
  dateKeyForViewStripDay,
  isViewStripDayBeforeToday,
  mealDayIndexForViewStrip,
  viewStripIndexForToday,
  viewWeekStartYmdLocal,
  weekDatesFromStart,
} from '@/lib/weekUtils';
import { getTriggerVerse } from '@/lib/verses';
import { normalizeDay, useCompletionStore } from '@/stores/completionStore';
import { usePlanStore } from '@/stores/planStore';
import { usePlanWeekEnsureStore } from '@/stores/planWeekEnsureStore';
import { useUiStore } from '@/stores/uiStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useVerseModalStore } from '@/stores/verseModalStore';
import type { Meal } from '@/types/plan';

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
  const selectedPlanDay = useUiStore((s) => s.selectedPlanDay);
  const setSelectedPlanDay = useUiStore((s) => s.setSelectedPlanDay);
  const byDay = useCompletionStore((s) => s.byDay);
  const toggleMeal = useCompletionStore((s) => s.toggleMeal);
  const updateMeal = usePlanStore((s) => s.updateMeal);
  const showVerse = useVerseModalStore((s) => s.show);
  const tier = useSubscriptionStore((s) => s.tier);
  const headerRight =
    tier === 'coaching' ? <CoachChatHeaderButton /> : <PlanUpgradeBadge />;
  const [mealEditing, setMealEditing] = useState<Meal | null>(null);
  const weekPlanEnsuring = usePlanWeekEnsureStore((s) => s.inProgress);

  /** Calendar strip always shows Mon–Sun of the week that contains **today**. */
  const viewWeekYmd = viewWeekStartYmdLocal();
  const isPastDay = isViewStripDayBeforeToday(viewWeekYmd, selectedPlanDay);

  const selectedCalendarDate = useMemo(
    () => weekDatesFromStart(viewWeekYmd)[selectedPlanDay] ?? null,
    [viewWeekYmd, selectedPlanDay]
  );

  const selectedDateLong = selectedCalendarDate
    ? selectedCalendarDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  useEffect(() => {
    setSelectedPlanDay(viewStripIndexForToday(viewWeekStartYmdLocal()));
  }, [weekStart, setSelectedPlanDay]);

  const hasPlanData =
    weekStart != null && macroTargets != null && mealsByDay != null;

  const planMealIndex =
    hasPlanData && weekStart
      ? mealDayIndexForViewStrip(weekStart, viewWeekYmd, selectedPlanDay)
      : null;
  const dateKey = hasPlanData
    ? dateKeyForViewStripDay(viewWeekYmd, selectedPlanDay)
    : '';
  const dayMeals =
    hasPlanData && planMealIndex != null
      ? mealsByDay![planMealIndex] ?? []
      : [];
  const completion = normalizeDay(byDay[dateKey]);

  const logged = useMemo(() => {
    const done = dayMeals.filter((m) => completion.mealIds.includes(m.id));
    return sumMacrosForMeals(done);
  }, [dayMeals, completion.mealIds]);

  const onMealToggle = (mealId: string) => {
    if (isPastDay) return;
    const nowDone = toggleMeal(dateKey, mealId);
    if (nowDone) {
      const v = getTriggerVerse('gratitude', `${dateKey}-${mealId}-fuel`);
      showVerse(v, 'Give thanks — your body is a gift.');
    }
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
        <TabScreenHeading title="Fuel" rightSlot={headerRight} />
        <WeekStrip
          weekStartYmd={viewWeekYmd}
          selectedIndex={selectedPlanDay}
          onSelect={setSelectedPlanDay}
        />
        {isPastDay ? (
          <Text style={styles.pastHint}>Past day — view only</Text>
        ) : null}
        {!hasPlanData ? (
          weekPlanEnsuring ? (
            <View style={styles.generatingBox}>
              <View style={{ marginBottom: 16, alignItems: 'center' }}>
                <AppLoadingCross size="medium" />
              </View>
              <Text style={styles.generatingTitle}>Generating your custom plan</Text>
              <Text style={styles.muted}>
                Your personalized meals for this week are on the way…
              </Text>
            </View>
          ) : (
            <PlanStripEmptyHint variant="fuel" />
          )
        ) : (
          <>
            {selectedDateLong ? (
              <Text style={styles.selectedDateCaption}>{selectedDateLong}</Text>
            ) : null}
            <MacroDashboard
              targets={macroTargets!}
              loggedKcal={logged.kcal}
              loggedProtein={logged.proteinG}
              loggedCarbs={logged.carbsG}
              loggedFat={logged.fatG}
            />
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Daily log</Text>
              <Pressable onPress={() => router.push('/grocery')}>
                <Text style={styles.link}>Grocery</Text>
              </Pressable>
            </View>
            {planMealIndex == null ? (
              weekPlanEnsuring ? (
                <View style={styles.generatingInline}>
                  <AppLoadingCross size="medium" />
                  <Text style={styles.generatingInlineTitle}>
                    Generating your custom plan
                  </Text>
                  <Text style={styles.outsidePlanHint}>
                    Your daily log will fill in here as soon as your week is ready…
                  </Text>
                </View>
              ) : (
                <Text style={styles.outsidePlanHint}>
                  No meals for this date — it falls outside your saved plan week (plan
                  starts {weekStart}).
                </Text>
              )
            ) : null}
            {dayMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                completed={completion.mealIds.includes(meal.id)}
                onToggleComplete={() => onMealToggle(meal.id)}
                onEdit={setMealEditing}
                readOnly={isPastDay}
              />
            ))}
          </>
        )}
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
      <EditMealModal
        visible={mealEditing != null}
        meal={mealEditing}
        onClose={() => setMealEditing(null)}
        onSave={(updated) => {
          if (!weekStart) {
            setMealEditing(null);
            return;
          }
          const idx = mealDayIndexForViewStrip(
            weekStart,
            viewWeekYmd,
            selectedPlanDay
          );
          if (idx != null) updateMeal(idx, updated.id, updated);
          setMealEditing(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  selectedDateCaption: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 14,
    marginTop: -4,
  },
  outsidePlanHint: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 19,
    marginBottom: 16,
    paddingVertical: 8,
  },
  generatingBox: {
    padding: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  generatingTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  generatingInline: {
    marginBottom: 16,
    paddingVertical: 12,
    gap: 8,
  },
  generatingInlineTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 15,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  pastHint: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 12,
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
