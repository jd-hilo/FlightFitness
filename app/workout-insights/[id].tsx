import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <Header onBack={() => router.back()} />
        <View style={styles.emptyBox}>
          <Text style={styles.muted}>This workout is no longer available.</Text>
        </View>
      </View>
    );
  }

  const hasHistory = entries.length > 0;
  const hasSessions = sessions.length > 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Header onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 48,
          paddingHorizontal: 20,
        }}>
        <Text style={styles.kicker}>Insights</Text>
        <Text style={styles.title}>{workout.title}</Text>

        <View style={styles.statGrid}>
          <StatCard label="Times done" value={String(overview.timesPerformed)} />
          <StatCard
            label="Last done"
            value={formatRelativeDate(overview.lastPerformedKey)}
          />
          <StatCard
            label="Avg time"
            value={
              overview.avgDurationSec > 0
                ? formatDuration(overview.avgDurationSec)
                : '—'
            }
          />
          <StatCard
            label="Best time"
            value={
              overview.bestDurationSec > 0
                ? formatDuration(overview.bestDurationSec)
                : '—'
            }
          />
          <StatCard
            label="Weight moved"
            value={
              overview.totalVolumeLb > 0
                ? formatVolume(overview.totalVolumeLb)
                : '—'
            }
          />
        </View>

        {!hasSessions ? (
          <View style={styles.emptyBox}>
            <MaterialIcons
              name="insights"
              size={28}
              color={theme.colors.gold}
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
                      color={theme.colors.gold}
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
            <Text style={styles.sectionTitle}>Exercise trends</Text>
            <Text style={styles.sectionCaption}>
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
              color={theme.colors.gold}
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

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12}>
        <MaterialIcons name="arrow-back" size={24} color={theme.colors.gold} />
      </Pressable>
      <Text style={styles.headerTitle}>Insights</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
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
                delta > 0 ? theme.colors.gold : theme.colors.onSurfaceVariant
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  headerTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginTop: 20,
  },
  title: {
    fontFamily: theme.fonts.headline,
    fontSize: 26,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 20,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 14,
  },
  statValue: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.gold,
  },
  statLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  section: { marginTop: 28 },
  sectionBody: { marginTop: 14 },
  recentList: { gap: 8 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  recentText: { flex: 1, gap: 4 },
  recentDate: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  recentDuration: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.gold,
  },
  editBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
  },
  sectionHead: {
    marginTop: 32,
    marginBottom: 4,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 20,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  sectionCaption: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  segmentBtnActive: { backgroundColor: theme.colors.gold },
  segmentTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  segmentTxtActive: { color: theme.colors.onGold },
  exCard: {
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 16,
    marginTop: 12,
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
    fontSize: 15,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
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
  deltaTxtUp: { color: theme.colors.gold },
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
    fontStyle: 'italic',
    marginTop: 10,
  },
  emptyBox: {
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 24,
    marginTop: 16,
  },
  emptyTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  muted: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
  },
});
