import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { DayHabitScores } from '@/lib/trackingWeekScores';

type Props = {
  days: DayHabitScores[];
};

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

function dayLabel(ymd: string) {
  return parseYmd(ymd).toLocaleDateString('en-US', { weekday: 'narrow' });
}

const ROWS: { key: keyof Pick<DayHabitScores, 'train' | 'fuel' | 'faith'>; label: string; color: string }[] = [
  { key: 'train', label: 'Train', color: theme.colors.gold },
  { key: 'fuel', label: 'Fuel', color: '#E8E8E8' },
  { key: 'faith', label: 'Faith', color: '#9AA0A6' },
];

function HabitBar({ value, color }: { value: number; color: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { height: `${Math.max(pct, value > 0 ? 8 : 0)}%`, backgroundColor: color }]} />
    </View>
  );
}

export function WeeklyHabitChart({ days }: Props) {
  if (days.length === 0) {
    return (
      <Text style={styles.empty}>Complete workouts, meals, or faith tasks to see your week.</Text>
    );
  }

  const avgTrain = days.reduce((s, d) => s + d.train, 0) / days.length;
  const avgFuel = days.reduce((s, d) => s + d.fuel, 0) / days.length;
  const avgFaith = days.reduce((s, d) => s + d.faith, 0) / days.length;

  return (
    <View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryVal}>{Math.round(avgTrain * 100)}%</Text>
        <Text style={styles.summaryVal}>{Math.round(avgFuel * 100)}%</Text>
        <Text style={styles.summaryVal}>{Math.round(avgFaith * 100)}%</Text>
      </View>
      <View style={styles.legend}>
        {ROWS.map((r) => (
          <View key={r.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: r.color }]} />
            <Text style={styles.legendTxt}>{r.label}</Text>
          </View>
        ))}
      </View>
      {ROWS.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <View style={styles.barsRow}>
            {days.map((d) => (
              <View key={`${row.key}-${d.dateKey}`} style={styles.col}>
                <HabitBar value={d[row.key]} color={row.color} />
                {row.key === 'faith' ? (
                  <Text style={styles.dayLbl}>{dayLabel(d.dateKey)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 19,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  summaryVal: {
    fontFamily: theme.fonts.headline,
    fontSize: 22,
    color: theme.colors.gold,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 14,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  rowLabel: {
    width: 36,
    fontFamily: theme.fonts.label,
    fontSize: 8,
    letterSpacing: 0.5,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    textAlign: 'right',
    paddingBottom: 18,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  col: { flex: 1, alignItems: 'center' },
  barTrack: {
    width: '100%',
    maxWidth: 20,
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainer,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', minHeight: 0 },
  dayLbl: {
    fontFamily: theme.fonts.label,
    fontSize: 8,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
