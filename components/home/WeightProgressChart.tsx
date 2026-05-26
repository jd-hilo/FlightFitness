import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { WeightLogEntry } from '@/stores/weightLogStore';

type Props = {
  entries: WeightLogEntry[];
  targetWeightLb?: number;
};

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

function formatShortDate(ymd: string) {
  if (ymd === 'start') return 'Start';
  return parseYmd(ymd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDayLabel(ymd: string) {
  if (ymd === 'start') return 'S';
  return parseYmd(ymd).toLocaleDateString('en-US', { weekday: 'narrow' });
}

export function WeightProgressChart({ entries, targetWeightLb }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const points = useMemo(() => entries.slice(-14), [entries]);
  const selected = points.find((p) => p.dateKey === selectedKey) ?? points[points.length - 1];

  if (points.length === 0) {
    return (
      <Text style={styles.empty}>
        Save a weigh-in to start tracking progress.
      </Text>
    );
  }

  const weights = points.map((p) => p.weightLb);
  const minW = Math.min(...weights, targetWeightLb ?? weights[0]!);
  const maxW = Math.max(...weights, targetWeightLb ?? weights[0]!);
  const span = Math.max(maxW - minW, 8);
  const showTrendHint = points.length === 1;
  const isBaselineOnly = points.length === 1 && points[0]?.dateKey === 'start';

  return (
    <View>
      {showTrendHint ? (
        <Text style={styles.hint}>
          {isBaselineOnly
            ? 'Starting weight from your profile. Save a weigh-in to begin tracking.'
            : 'One entry logged. Save another day to compare your trend.'}
        </Text>
      ) : null}
      <View style={styles.chart}>
        {targetWeightLb != null ? (
          <View
            style={[
              styles.targetLine,
              { bottom: `${((targetWeightLb - minW) / span) * 100}%` },
            ]}
          />
        ) : null}
        {points.map((p) => {
          const h = ((p.weightLb - minW) / span) * 100;
          const active = selected?.dateKey === p.dateKey;
          return (
            <Pressable
              key={p.dateKey}
              style={styles.col}
              onPress={() => setSelectedKey(p.dateKey)}>
              <View style={[styles.barTrack, active && styles.barTrackActive]}>
                <View style={[styles.barFill, { height: `${Math.max(8, h)}%` }]} />
              </View>
              <Text style={[styles.dayLbl, active && styles.dayLblActive]}>
                {formatDayLabel(p.dateKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selected ? (
        <View style={styles.detail}>
          <Text style={styles.detailWeight}>{selected.weightLb} lb</Text>
          <Text style={styles.detailDate}>{formatShortDate(selected.dateKey)}</Text>
        </View>
      ) : null}
      {targetWeightLb != null ? (
        <Text style={styles.targetNote}>Gold line = target ({targetWeightLb} lb)</Text>
      ) : null}
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
  hint: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 17,
    marginBottom: 10,
  },
  chart: {
    height: 132,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 12,
    position: 'relative',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.gold,
    opacity: 0.45,
    zIndex: 1,
  },
  col: { flex: 1, alignItems: 'center', zIndex: 2 },
  barTrack: {
    width: '100%',
    maxWidth: 22,
    height: 108,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainer,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barTrackActive: { borderColor: theme.colors.gold },
  barFill: {
    width: '100%',
    backgroundColor: theme.colors.gold,
    minHeight: 4,
  },
  dayLbl: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  dayLblActive: { color: theme.colors.gold },
  detail: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 4,
  },
  detailWeight: {
    fontFamily: theme.fonts.headline,
    fontSize: 28,
    color: theme.colors.gold,
  },
  detailDate: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  targetNote: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
});
