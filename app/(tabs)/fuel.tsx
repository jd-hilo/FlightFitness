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

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { CoachChatHeaderButton } from '@/components/CoachChatHeaderButton';
import { PlanStripEmptyHint } from '@/components/PlanStripEmptyHint';
import { PlanUpgradeBadge } from '@/components/PlanUpgradeBadge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TabScreenHeading } from '@/components/TabScreenHeading';
import { MacroDashboard } from '@/components/plan/MacroDashboard';
import { MealCard } from '@/components/plan/MealCard';
import { MealEditorModal } from '@/components/plan/MealEditorModal';
import { WeekStrip } from '@/components/WeekStrip';
import { theme } from '@/constants/theme';
import { paywallHref } from '@/lib/analytics';
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
import { useSubscriptionStore, savedMealLimit } from '@/stores/subscriptionStore';
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

type MealEditorState =
  | { mode: 'add' }
  | { mode: 'edit'; meal: Meal };

export default function FuelScreen() {
  const insets = useSafeAreaInsets();
  const weekStart = usePlanStore((s) => s.weekStart);
  const macroTargets = usePlanStore((s) => s.macroTargets);
  const mealsByDay = usePlanStore((s) => s.mealsByDay);
  const mealTemplates = usePlanStore((s) => s.mealTemplates);
  const selectedPlanDay = useUiStore((s) => s.selectedPlanDay);
  const setSelectedPlanDay = useUiStore((s) => s.setSelectedPlanDay);
  const byDay = useCompletionStore((s) => s.byDay);
  const toggleMeal = useCompletionStore((s) => s.toggleMeal);
  const ensureWeekPlanShell = usePlanStore((s) => s.ensureWeekPlanShell);
  const addMeal = usePlanStore((s) => s.addMeal);
  const updateMeal = usePlanStore((s) => s.updateMeal);
  const removeMeal = usePlanStore((s) => s.removeMeal);
  const saveMealTemplate = usePlanStore((s) => s.saveMealTemplate);
  const showVerse = useVerseModalStore((s) => s.show);
  const tier = useSubscriptionStore((s) => s.tier);
  const headerRight =
    tier === 'coaching' ? <CoachChatHeaderButton /> : <PlanUpgradeBadge />;
  const [editor, setEditor] = useState<MealEditorState | null>(null);
  const weekPlanEnsuring = usePlanWeekEnsureStore((s) => s.inProgress);

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

  const hasPlanShell =
    weekStart != null && macroTargets != null && mealsByDay != null;

  useEffect(() => {
    if (!hasPlanShell && !weekPlanEnsuring) {
      ensureWeekPlanShell(viewWeekYmd);
    }
  }, [hasPlanShell, weekPlanEnsuring, viewWeekYmd, ensureWeekPlanShell]);

  const planMealIndex =
    hasPlanShell && weekStart
      ? mealDayIndexForViewStrip(weekStart, viewWeekYmd, selectedPlanDay)
      : null;
  const dateKey = hasPlanShell
    ? dateKeyForViewStripDay(viewWeekYmd, selectedPlanDay)
    : '';
  const dayMeals =
    hasPlanShell && planMealIndex != null
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

  const openAddMeal = () => {
    if (isPastDay) return;
    ensureWeekPlanShell(viewWeekYmd);
    setEditor({ mode: 'add' });
  };

  const canLogToday = !isPastDay && planMealIndex != null;
  const mealLimit = savedMealLimit(tier);

  const resolveMealDayIndex = () => {
    const ws = usePlanStore.getState().weekStart;
    if (!ws) return null;
    return mealDayIndexForViewStrip(ws, viewWeekYmd, selectedPlanDay);
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

        {!hasPlanShell ? (
          weekPlanEnsuring ? (
            <View style={styles.generatingBox}>
              <AppLoadingCross size="medium" />
              <Text style={styles.generatingTitle}>Loading your week</Text>
            </View>
          ) : (
            <PlanStripEmptyHint variant="fuel" onBuildManual={openAddMeal} />
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
              {mealLimit != null ? (
                <Text style={styles.limitHint}>
                  {mealTemplates.length} of {mealLimit} saved meals on Free
                </Text>
              ) : null}
            </View>

            {planMealIndex == null ? (
              <Text style={styles.outsidePlanHint}>
                Outside your saved plan week — tap Start this week on Train or add meals after
                selecting an in-range day.
              </Text>
            ) : null}

            {dayMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                completed={completion.mealIds.includes(meal.id)}
                onToggleComplete={() => onMealToggle(meal.id)}
                onEdit={(m) => setEditor({ mode: 'edit', meal: m })}
                readOnly={isPastDay}
              />
            ))}

            {canLogToday ? (
              <Pressable style={styles.addMealBtn} onPress={openAddMeal}>
                <MaterialIcons name="add" size={20} color={theme.colors.gold} />
                <Text style={styles.addMealBtnTxt}>Add meal</Text>
              </Pressable>
            ) : null}

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

      <MealEditorModal
        visible={editor != null}
        mode={editor?.mode ?? 'add'}
        meal={editor?.mode === 'edit' ? editor.meal : null}
        mealTemplates={mealTemplates}
        onClose={() => setEditor(null)}
        onSave={(updated) => {
          const idx = resolveMealDayIndex();
          if (idx == null) {
            setEditor(null);
            return;
          }
          if (editor?.mode === 'edit') {
            updateMeal(idx, updated.id, updated);
          } else {
            addMeal(idx, updated);
            const logDateKey = dateKeyForViewStripDay(viewWeekYmd, selectedPlanDay);
            if (!isPastDay && logDateKey) {
              const nowDone = toggleMeal(logDateKey, updated.id);
              if (nowDone) {
                const v = getTriggerVerse('gratitude', `${logDateKey}-${updated.id}-fuel`);
                showVerse(v, 'Give thanks — your body is a gift.', { confetti: true });
              }
            }
            const saved = saveMealTemplate(updated);
            if (!saved) {
              Alert.alert(
                'Saved meal limit reached',
                'Free includes up to 5 saved meals. Upgrade to Essentials for unlimited saved meals.',
                [
                  { text: 'OK', style: 'cancel' },
                  { text: 'Upgrade', onPress: () => router.push(paywallHref('fuel_gate')) },
                ]
              );
            }
          }
          setEditor(null);
        }}
        onDelete={
          editor?.mode === 'edit'
            ? () => {
                const idx = resolveMealDayIndex();
                if (idx == null) {
                  setEditor(null);
                  return;
                }
                removeMeal(idx, editor.meal.id);
                setEditor(null);
              }
            : undefined
        }
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
  generatingBox: { padding: 24, gap: 12, alignItems: 'flex-start' },
  generatingTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
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
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,215,0,0.3)',
    marginTop: 20,
    gap: 6,
  },
  limitHint: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  addMealBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 28,
    color: theme.colors.onBackground,
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
  energyRowLast: { borderBottomWidth: 0 },
  energyIcon: { marginTop: 2 },
  energyRowText: { flex: 1, minWidth: 0 },
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
});
