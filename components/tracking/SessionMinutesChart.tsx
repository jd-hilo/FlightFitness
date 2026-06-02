import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type Point = { dateKey: string; minutes: number };

type Props = {
  points: Point[];
};

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

function dayLabel(ymd: string) {
  return parseYmd(ymd).toLocaleDateString('en-US', { weekday: 'narrow' });
}

export function SessionMinutesChart({ points }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const maxMin = useMemo(
    () => Math.max(15, ...points.map((p) => p.minutes)),
    [points]
  );
  const selected =
    points.find((p) => p.dateKey === selectedKey) ?? points[points.length - 1];
  const total = useMemo(
    () => points.reduce((s, p) => s + p.minutes, 0),
    [points]
  );

  if (total === 0) return null;

  return (
    <View>
      <View style={styles.chart}>
        {points.map((p) => {
          const h = (p.minutes / maxMin) * 100;
          const active = selected?.dateKey === p.dateKey;
          return (
            <Pressable
              key={p.dateKey}
              style={styles.col}
              onPress={() => setSelectedKey(p.dateKey)}>
              <View style={[styles.barTrack, active && styles.barTrackActive]}>
                <View
                  style={[
                    styles.barFill,
                    { height: `${p.minutes > 0 ? Math.max(10, h) : 0}%` },
                  ]}
                />
              </View>
              <Text style={[styles.dayLbl, active && styles.dayLblActive]}>
                {dayLabel(p.dateKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selected ? (
        <View style={styles.detail}>
          <Text style={styles.detailVal}>{selected.minutes}</Text>
          <Text style={styles.detailUnit}>min</Text>
        </View>
      ) : null}
      <Text style={styles.caption}>{total} min logged this week</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 8,
  },
  col: { flex: 1, alignItems: 'center' },
  barTrack: {
    width: '100%',
    maxWidth: 22,
    height: 80,
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
    minHeight: 0,
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
    gap: 6,
    marginBottom: 4,
  },
  detailVal: {
    fontFamily: theme.fonts.headline,
    fontSize: 26,
    color: theme.colors.gold,
  },
  detailUnit: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  caption: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
});
