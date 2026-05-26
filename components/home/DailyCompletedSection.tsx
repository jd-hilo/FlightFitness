import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { formatDuration } from '@/lib/formatDuration';
import type { WorkoutSessionLogEntry } from '@/stores/workoutSessionLogStore';

type MealDone = {
  id: string;
  name: string;
  kcal: number;
  proteinG: number;
};

type FaithDone = {
  verseRead: boolean;
  studyRead: boolean;
  journalDone: boolean;
};

type Props = {
  librarySessions: WorkoutSessionLogEntry[];
  planWorkoutTitle: string | null;
  planWorkoutDone: boolean;
  meals: MealDone[];
  faith: FaithDone;
};

function DoneRow({
  title,
  meta,
}: {
  title: string;
  meta?: string;
}) {
  return (
    <View style={styles.row}>
      <MaterialIcons name="check-circle" size={22} color={theme.colors.gold} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      </View>
    </View>
  );
}

export function DailyCompletedSection({
  librarySessions,
  planWorkoutTitle,
  planWorkoutDone,
  meals,
  faith,
}: Props) {
  const faithItems: { title: string; meta?: string }[] = [];
  if (faith.verseRead) faithItems.push({ title: 'Daily verse', meta: 'Faith tab' });
  if (faith.studyRead) faithItems.push({ title: "Today's study", meta: 'Scripture reading' });
  if (faith.journalDone) faithItems.push({ title: 'Reflection journal', meta: 'Faith tab' });

  const hasAnything =
    librarySessions.length > 0 ||
    (planWorkoutDone && planWorkoutTitle) ||
    meals.length > 0 ||
    faithItems.length > 0;

  return (
    <View style={styles.card}>
      {!hasAnything ? (
        <Text style={styles.empty}>
          Nothing logged yet today. Finish a workout, check off a meal, or complete your
          scripture habits to see them here.
        </Text>
      ) : (
        <>
          {librarySessions.map((s) => (
            <DoneRow
              key={s.id}
              title={`Workout · ${s.title}`}
              meta={formatDuration(s.durationSec)}
            />
          ))}
          {planWorkoutDone && planWorkoutTitle ? (
            <DoneRow title={`Workout · ${planWorkoutTitle}`} meta="Plan day complete" />
          ) : null}
          {meals.map((m) => (
            <DoneRow
              key={m.id}
              title={`Meal · ${m.name}`}
              meta={`${m.kcal} kcal · ${m.proteinG}g protein`}
            />
          ))}
          {faithItems.map((item) => (
            <DoneRow key={item.title} title={item.title} meta={item.meta} />
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  empty: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 19,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  rowMeta: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
});
