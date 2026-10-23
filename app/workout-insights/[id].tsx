import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { frostedTile, pageTitleStyle } from '@/components/FrostedCard';
import { BarChart, type BarDatum } from '@/components/insights/BarChart';
import { EditSessionDurationModal } from '@/components/insights/EditSessionDurationModal';
import { theme } from '@/constants/theme';
import { formatDuration } from '@/lib/formatDuration';
import { paywallHref } from '@/lib/analytics';
import { pullUserTrackingIntoStores } from '@/lib/api/trackingPersistence';
import {
  buildDurationTrend,
  buildExerciseProgress,
  buildOverview,
  buildWeeklyFrequency,
  formatRelativeDate,
  formatVolume,
  mergeSessionsForInsights,
  type ExerciseProgress,
} from '@/lib/insights/workoutInsights';
import { supabaseConfigured } from '@/lib/supabase';
import { useExerciseHistoryStore } from '@/stores/exerciseHistoryStore';
import { hasEssentialsAccess, useSubscriptionStore } from '@/stores/subscriptionStore';
import { useWorkoutLibraryStore } from '@/stores/workoutLibraryStore';
import {
  useWorkoutSessionLogStore,
  type WorkoutSessionLogEntry,
} from '@/stores/workoutSessionLogStore';

type Metric = 'weight' | 'oneRm' | 'volume';

const METRICS: { id: Metric; label: string }[] = [
  { id: 'weight', label: 'Weight' },
  { id: 'oneRm', label: 'Est. 1RM' },
  { id: 'volume', label: 'Volume' },
];

export default function WorkoutInsightsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tier = useSubscriptionStore((s) => s.tier);
  const workouts = useWorkoutLibraryStore((s) => s.workouts);
  const allEntries = useExerciseHistoryStore((s) => s.entries);
  const allSessions = useWorkoutSessionLogStore((s) => s.sessions);
  const updateSessionDuration = useWorkoutSessionLogStore(
    (s) => s.updateSessionDuration
  );
  const [metric, setMetric] = useState<Metric>('weight');
  const [editingSession, setEditingSession] =
    useState<WorkoutSessionLogEntry | null>(null);

  const workout = useMemo(
    () => workouts.find((w) => w.id === id) ?? null,
    [workouts, id]
  );

  const entries = useMemo(
    () => allEntries.filter((e) => e.sourceWorkoutId === id),
    [allEntries, id]
  );
  const rawSessions = useMemo(
    () => allSessions.filter((s) => s.sourceWorkoutId === id),
    [allSessions, id]
  );
  const sessions = useMemo(
    () => mergeSessionsForInsights(rawSessions, entries),
    [rawSessions, entries]
  );
  const recentSessions = useMemo(() => sessions.slice(0, 3), [sessions]);

  const overview = useMemo(
    () => buildOverview(rawSessions, entries),
    [rawSessions, entries]
  );
  const frequency = useMemo(
    () => buildWeeklyFrequency(rawSessions, entries),
    [rawSessions, entries]
  );
  const durationTrend = useMemo(
    () => buildDurationTrend(rawSessions, entries, 3),
    [rawSessions, entries]
  );
  const progress = useMemo(() => buildExerciseProgress(entries), [entries]);

  useEffect(() => {
    if (!hasEssentialsAccess(tier)) {
      router.replace(paywallHref('insights_gate'));
    }
  }, [tier]);

  useEffect(() => {
    if (!supabaseConfigured || !hasEssentialsAccess(tier)) return;
    void pullUserTrackingIntoStores();
  }, [tier, id]);

  if (!hasEssentialsAccess(tier)) {
    return <View style={[styles.screen, { paddingTop: insets.top + 8 }]} />;
  }

  if (!workout) {
    return (
      <View style={[styles.screen, styles.scroll, { paddingTop: insets.top + 14 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.onBackground} />
        </Pressable>
        <View style={styles.emptyBox}>
          <Text style={styles.muted}>This workout is no longer available.</Text>
        </View>
      </View>
    );
  }

  const hasHistory = entries.length > 0;
  const hasSessions = sessions.length > 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back">
            <MaterialIcons name="arrow-back" size={22} color={theme.colors.onBackground} />
          </Pressable>
          <Text style={styles.title} numberOfLines={2}>
            {workout.title}
          </Text>
        </View>

        <View style={styles.statGrid}>
          <StatCard
            label="Times done"
            value={String(overview.timesPerformed)}
            icon="bar-chart"
            iconColor={theme.colors.champagne}
          />
          <StatCard
            label="Last done"
            value={formatRelativeDate(overview.lastPerformedKey)}
            icon="event"
          />
          <StatCard
            label="Avg time"
            value={overview.avgDurationSec > 0 ? formatDuration(overview.avgDurationSec) : '—'}
            icon="schedule"
          />
          <StatCard
            label="Best time"
            value={overview.bestDurationSec > 0 ? formatDuration(overview.bestDurationSec) : '—'}
            icon="timer"
          />
          <StatCard
            label="Weight moved"
            value={overview.totalVolumeLb > 0 ? formatVolume(overview.totalVolumeLb) : '—'}
            icon="fitness-center"
            iconColor={theme.colors.champagne}
          />
        </View>

        {!hasSessions ? (
          <View style={styles.emptyBox}>
            <MaterialIcons
              name="insights"
              size={28}
              color={theme.colors.champagne}
            />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.muted}>
              Finish this workout to start tracking your weight, strength, and
              volume over time. Progress tracking begins with your next session.
            </Text>
          </View>
        ) : null}

        {recentSessions.length > 0 ? (
          <Section
            title="Recent sessions"
            caption="Last 3 workouts — tap edit to adjust duration">
            <View style={styles.recentList}>
              {recentSessions.map((session) => (
                <View key={session.id} style={styles.recentRow}>
                  <View style={styles.recentText}>
                    <Text style={styles.recentDate}>
                      {formatRelativeDate(session.dateKey)}
                    </Text>
                    <Text style={styles.recentDuration}>
                      {session.durationSec > 0
                        ? formatDuration(session.durationSec)
                        : 'No duration'}
                      {(session.volumeLb ?? 0) > 0
                        ? ` · ${formatVolume(session.volumeLb ?? 0)}`
                        : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      setEditingSession({
                        ...session,
                        title: session.title || workout.title,
                      })
                    }
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Edit session duration"
                    style={styles.editBtn}>
                    <MaterialIcons
                      name="edit"
                      size={20}
                      color={theme.colors.champagne}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {hasSessions ? (
          <Section title="Frequency" caption="Sessions per week (last 8 weeks)">
            <BarChart
              data={frequency.map((f) => ({ label: f.label, value: f.count }))}
            />
          </Section>
        ) : null}

        {durationTrend.length > 0 ? (
          <Section
            title="Session length"
            caption="Last 3 sessions with a duration">
            <BarChart
              data={durationTrend.map(
                (d): BarDatum => ({
                  label: d.label,
                  value: d.durationSec,
                  valueLabel: formatDuration(d.durationSec),
                })
              )}
            />
          </Section>
        ) : null}

        {hasHistory ? (
          <View style={styles.sectionHead}>
            <Text style={styles.cardTitle}>Exercise trends</Text>
            <Text style={styles.cardCaption}>
              Top set, estimated 1RM, and volume across sessions
            </Text>
            <View style={styles.segment}>
              {METRICS.map((m) => {
                const active = metric === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMetric(m.id)}
                    style={[styles.segmentBtn, active && styles.segmentBtnActive]}>
                    <Text
                      style={[
                        styles.segmentTxt,
                        active && styles.segmentTxtActive,
                      ]}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : hasSessions ? (
          <View style={styles.emptyBox}>
            <MaterialIcons
              name="show-chart"
              size={28}
              color={theme.colors.champagne}
            />
            <Text style={styles.emptyTitle}>Exercise trends</Text>
            <Text style={styles.muted}>
              Check off sets (or change weight/reps) before finishing so each lift
              can chart over time.
            </Text>
          </View>
        ) : null}

        {progress.map((ex) => (
          <ExerciseProgressCard
            key={ex.exerciseKey}
            exercise={ex}
            metric={metric}
          />
        ))}
      </ScrollView>

      <EditSessionDurationModal
        visible={editingSession != null}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onSave={(sessionId, durationSec) => {
          const seed = editingSession;
          updateSessionDuration(
            sessionId,
            durationSec,
            seed
              ? {
                  id: seed.id,
                  title: seed.title || workout.title,
                  sourceWorkoutId: seed.sourceWorkoutId,
                  dateKey: seed.dateKey,
                  finishedAt: seed.finishedAt,
                  volumeLb: seed.volumeLb,
                }
              : undefined
          );
          setEditingSession(null);
        }}
      />
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconColor = theme.colors.onBackground,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
        <MaterialIcons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
    </View>
  );
}

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {caption ? <Text style={styles.cardCaption}>{caption}</Text> : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function ExerciseProgressCard({
  exercise,
  metric,
}: {
  exercise: ExerciseProgress;
  metric: Metric;
}) {
  const points = exercise.points.slice(-10);
  const data: BarDatum[] = points.map((p) => {
    const date = p.dateKey.slice(5).replace('-', '/');
    if (metric === 'weight') {
      return {
        label: date,
        value: p.topWeightLb,
        valueLabel: `${Math.round(p.topWeightLb)}`,
      };
    }
    if (metric === 'oneRm') {
      return {
        label: date,
        value: p.bestOneRm,
        valueLabel: `${Math.round(p.bestOneRm)}`,
      };
    }
    return {
      label: date,
      value: p.volumeLb,
      valueLabel:
        p.volumeLb >= 1000
          ? `${Math.round(p.volumeLb / 100) / 10}k`
          : `${p.volumeLb}`,
    };
  });

  const first = points[0];
  const last = points[points.length - 1];
  const metricValue = (p: typeof last) =>
    metric === 'weight'
      ? p!.topWeightLb
      : metric === 'oneRm'
        ? p!.bestOneRm
        : p!.volumeLb;
  const delta =
    first && last && points.length > 1
      ? metricValue(last) - metricValue(first)
      : 0;

  const headline =
    metric === 'weight'
      ? `${Math.round(exercise.latestTopWeightLb)} lb top set`
      : metric === 'oneRm'
        ? `${Math.round(exercise.latestOneRm)} lb est. 1RM`
        : `${formatVolume(exercise.totalVolumeLb)} total`;

  return (
    <View style={styles.exCard}>
      <View style={styles.exHeadRow}>
        <Text style={styles.exName} numberOfLines={1}>
          {exercise.name}
        </Text>
        {delta !== 0 ? (
          <View style={styles.deltaPill}>
            <MaterialIcons
              name={delta > 0 ? 'trending-up' : 'trending-down'}
              size={13}
              color={
                delta > 0 ? theme.colors.champagne : theme.colors.onSurfaceVariant
              }
            />
            <Text style={[styles.deltaTxt, delta > 0 && styles.deltaTxtUp]}>
              {delta > 0 ? '+' : ''}
              {metric === 'volume'
                ? formatVolume(Math.abs(delta)).replace(' lb', '')
                : Math.round(delta)}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.exHeadline}>{headline}</Text>
      {points.length >= 1 ? (
        <View style={styles.exChart}>
          <BarChart data={data} height={128} valueSize="lg" />
        </View>
      ) : null}
      {points.length === 1 ? (
        <Text style={styles.exHint}>
          One session logged — keep training to see your trend.
        </Text>
      ) : null}
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
    gap: 12,
    marginBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
  },
  title: {
    ...pageTitleStyle,
    flex: 1,
  },
  statGrid: {
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
    fontSize: 28,
    letterSpacing: -0.8,
    color: theme.colors.onBackground,
  },
  card: {
    ...frostedTile,
    padding: 18,
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.onBackground,
  },
  cardCaption: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  cardBody: { marginTop: 14 },
  recentList: { gap: 0 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  recentText: { flex: 1, gap: 2 },
  recentDate: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  recentDuration: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.onBackground,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
  },
  sectionHead: {
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  segmentTxt: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  segmentTxtActive: {
    fontFamily: theme.fonts.label,
    color: theme.colors.onBackground,
  },
  exCard: {
    ...frostedTile,
    padding: 18,
    marginBottom: 12,
  },
  exHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  exName: {
    flex: 1,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.onBackground,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  deltaTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  deltaTxtUp: { color: theme.colors.champagne },
  exHeadline: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  exChart: { marginTop: 16 },
  exHint: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: 10,
  },
  emptyBox: {
    ...frostedTile,
    alignItems: 'center',
    gap: 10,
    padding: 24,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.onBackground,
  },
  muted: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
  },
});
