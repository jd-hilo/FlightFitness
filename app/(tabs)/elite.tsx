import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { frostedTile, pageTitleStyle } from '@/components/FrostedCard';
import { WeightProgressChart } from '@/components/home/WeightProgressChart';
import { ProgressRing, TrendLine } from '@/components/progress/TrendLine';
import { theme } from '@/constants/theme';
import {
  buildFaithTrend,
  buildProgressSummary,
  buildStrengthTrend,
  formatTrained,
  PROGRESS_RANGES,
  type ProgressRange,
} from '@/lib/progressStats';
import { isScreenshotMode } from '@/lib/screenshotMode';
import { getDailyVerse } from '@/lib/verses';
import { buildWeightChartEntries } from '@/lib/weightChartEntries';
import { useCompletionStore } from '@/stores/completionStore';
import { useDailyContentStore } from '@/stores/dailyContentStore';
import { useFaithDailyStore } from '@/stores/faithDailyStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useWeightLogStore } from '@/stores/weightLogStore';
import { useWorkoutSessionLogStore } from '@/stores/workoutSessionLogStore';

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<ProgressRange>(isScreenshotMode ? 'all' : 'week');

  const onboardingWeight = useOnboardingStore((s) => s.answers.currentWeightLb);
  const targetWeight = useOnboardingStore((s) => s.answers.targetWeightLb);
  const trainingStreak = useCompletionStore((s) => s.streak);
  const completionByDay = useCompletionStore((s) => s.byDay);
  const faithByDay = useFaithDailyStore((s) => s.byDay);
  const weightEntries = useWeightLogStore((s) => s.entries);
  const sessions = useWorkoutSessionLogStore((s) => s.sessions);
  const dailyRemote = useDailyContentStore((s) => s.content);

  const verse = useMemo(() => dailyRemote?.verse ?? getDailyVerse(), [dailyRemote]);

  const workoutDoneDays = useMemo(
    () =>
      Object.entries(completionByDay)
        .filter(([, d]) => d?.workoutDone)
        .map(([k]) => k),
    [completionByDay],
  );

  const summary = useMemo(
    () => buildProgressSummary({ range, sessions, workoutDoneDays, faithByDay }),
    [range, sessions, workoutDoneDays, faithByDay],
  );
  const trend = useMemo(() => buildStrengthTrend(range, sessions), [range, sessions]);
  const faithTrend = useMemo(() => buildFaithTrend(range, faithByDay), [range, faithByDay]);
  const hasVolume = trend.points.some((p) => p > 0);
  const hasFaith = faithTrend.points.some((p) => p > 0);

  const chartEntries = useMemo(
    () => buildWeightChartEntries(weightEntries, onboardingWeight),
    [weightEntries, onboardingWeight],
  );
  const latestWeight =
    weightEntries.length > 0
      ? ([...weightEntries].sort((a, b) => a.dateKey.localeCompare(b.dateKey)).at(-1)?.weightLb ??
        onboardingWeight)
      : onboardingWeight;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <Text style={styles.title}>Progress</Text>
          <Pressable
            style={({ pressed }) => [styles.moreBtn, pressed && styles.pressed]}
            onPress={() => router.push('/settings' as Href)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Profile and settings">
            <MaterialIcons name="more-horiz" size={22} color={theme.colors.onBackground} />
          </Pressable>
        </View>

        {isScreenshotMode ? (
          <View style={[styles.verseCard, { marginBottom: 16 }]}>
            <Text style={styles.verseText}>“{verse.text}”</Text>
            <Text style={styles.verseRef}>{verse.reference}</Text>
          </View>
        ) : null}

        <View style={styles.segment}>
          {PROGRESS_RANGES.map((r) => {
            const active = r.key === range;
            return (
              <Pressable
                key={r.key}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setRange(r.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}>
                <Text
                  style={[styles.segmentTxt, active && styles.segmentTxtActive]}
                  numberOfLines={1}>
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.grid}>
          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <Text style={styles.tileLabel} numberOfLines={1}>
                Workouts
              </Text>
              <MaterialIcons name="bar-chart" size={24} color={theme.colors.champagne} />
            </View>
            <Text
              style={styles.tileValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}>
              {summary.workouts}
            </Text>
            <Text style={styles.tileSub} numberOfLines={1}>
              {summary.workoutsDelta}
            </Text>
          </View>
          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <Text style={styles.tileLabel} numberOfLines={1}>
                Time Trained
              </Text>
              <MaterialIcons name="schedule" size={22} color={theme.colors.onBackground} />
            </View>
            <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatTrained(summary.trainedSec)}
            </Text>
            <Text style={styles.tileSub} numberOfLines={1}>
              {summary.timeDelta}
            </Text>
          </View>
          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <Text style={styles.tileLabel} numberOfLines={1}>
                Consistency
              </Text>
              <ProgressRing value={summary.consistency} size={24} />
            </View>
            <Text
              style={styles.tileValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}>
              {Math.round(summary.consistency * 100)}%
            </Text>
            <Text style={styles.tileSub} numberOfLines={1}>
              {summary.rangeCaption}
            </Text>
          </View>
          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <Text style={styles.tileLabel} numberOfLines={1}>
                Streak
              </Text>
              <MaterialIcons name="local-fire-department" size={24} color={theme.colors.orange} />
            </View>
            <Text
              style={styles.tileValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}>
              {trainingStreak}
            </Text>
            <Text style={styles.tileSub} numberOfLines={1}>
              {trainingStreak === 1 ? 'Day' : 'Days'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              Strength Trend
            </Text>
            <View style={styles.trendRight}>
              {trend.changePct != null ? (
                <Text
                  style={styles.trendPct}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}>
                  {trend.changePct >= 0 ? '+' : ''}
                  {trend.changePct}%
                </Text>
              ) : null}
              <Text style={styles.tileSub} numberOfLines={1}>
                {trend.caption}
              </Text>
            </View>
          </View>
          {hasVolume ? (
            <TrendLine points={trend.points} />
          ) : (
            <Text style={styles.muted}>
              Log weight and reps in a workout to see your lifted volume trend here.
            </Text>
          )}
        </View>

        <View style={styles.grid}>
          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <Text style={styles.tileLabel} numberOfLines={1}>
                Devotionals
              </Text>
              <MaterialIcons name="menu-book" size={20} color={theme.colors.champagne} />
            </View>
            <Text
              style={styles.tileValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}>
              {summary.devotionals}
            </Text>
            <Text style={styles.tileSub} numberOfLines={1}>
              {summary.devotionalsDelta}
            </Text>
          </View>
          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <Text style={styles.tileLabel} numberOfLines={1}>
                Reflections
              </Text>
              <MaterialIcons name="edit" size={20} color={theme.colors.onBackground} />
            </View>
            <Text
              style={styles.tileValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}>
              {summary.reflections}
            </Text>
            <Text style={styles.tileSub} numberOfLines={1}>
              {summary.reflectionsDelta}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              Faith Trend
            </Text>
            <View style={styles.trendRight}>
              {faithTrend.changePct != null ? (
                <Text
                  style={styles.trendPct}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}>
                  {faithTrend.changePct >= 0 ? '+' : ''}
                  {faithTrend.changePct}%
                </Text>
              ) : null}
              <Text style={styles.tileSub} numberOfLines={1}>
                {faithTrend.caption}
              </Text>
            </View>
          </View>
          {hasFaith ? (
            <TrendLine points={faithTrend.points} />
          ) : (
            <Text style={styles.muted}>
              Mark a devotional as read or finish a reflection to see your faith trend here.
            </Text>
          )}
        </View>

        <View style={[styles.card, styles.weightCard]}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              Weight
            </Text>
            <Text
              style={styles.weightNow}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}>
              {latestWeight} lb
              {targetWeight > 0 ? (
                <Text style={styles.weightTarget}> → {targetWeight} lb</Text>
              ) : null}
            </Text>
          </View>
          <WeightProgressChart
            entries={chartEntries}
            targetWeightLb={targetWeight > 0 ? targetWeight : undefined}
          />
        </View>

        {isScreenshotMode ? null : (
          <View style={styles.verseCard}>
            <Text style={styles.verseText}>“{verse.text}”</Text>
            <Text style={styles.verseRef}>{verse.reference}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 16 },
  pressed: { opacity: 0.85 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: pageTitleStyle,
  moreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  segmentTxt: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  segmentTxtActive: {
    fontFamily: theme.fonts.label,
    color: theme.colors.onBackground,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 12,
  },
  tile: {
    ...frostedTile,
    width: '48.5%',
    padding: 16,
  },
  tileHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tileLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.8)',
  },
  tileValue: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 32,
    letterSpacing: -0.8,
    color: theme.colors.onBackground,
  },
  tileSub: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  card: {
    ...frostedTile,
    padding: 18,
    marginBottom: 12,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  cardTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.onBackground,
  },
  trendRight: { alignItems: 'flex-end' },
  trendPct: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 22,
    color: theme.colors.champagne,
  },
  muted: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.onSurfaceVariant,
  },
  weightCard: { marginTop: 0 },
  weightNow: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.onBackground,
  },
  weightTarget: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  verseCard: {
    ...frostedTile,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  verseText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.onBackground,
    textAlign: 'center',
  },
  verseRef: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginTop: 14,
  },
});
