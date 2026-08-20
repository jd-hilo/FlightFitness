import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

export type BarDatum = {
  label: string;
  value: number;
  /** Optional display string for the value on top of the bar. */
  valueLabel?: string;
};

type Props = {
  data: BarDatum[];
  height?: number;
  /** Highlight the last bar (e.g. most recent session). */
  highlightLast?: boolean;
  showValues?: boolean;
  /** Larger value labels — used on exercise progress charts. */
  valueSize?: 'sm' | 'lg';
};

/** Lightweight vertical bar chart built from plain views (no chart dependency). */
export function BarChart({
  data,
  height = 120,
  highlightLast = true,
  showValues = true,
  valueSize = 'sm',
}: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const large = valueSize === 'lg';
  const valueBand = large ? 30 : 22;

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { height }]}>
        {data.map((d, i) => {
          const isLast = i === data.length - 1;
          const ratio = d.value / max;
          const barHeight = Math.max(d.value > 0 ? 4 : 0, ratio * (height - valueBand));
          const highlighted = highlightLast && isLast && d.value > 0;
          return (
            <View key={`${d.label}-${i}`} style={styles.col}>
              {showValues && d.value > 0 ? (
                <Text
                  style={[styles.value, large && styles.valueLg]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}>
                  {d.valueLabel ?? String(Math.round(d.value))}
                </Text>
              ) : (
                <View style={[styles.valueSpacer, large && styles.valueSpacerLg]} />
              )}
              <View
                style={[
                  styles.bar,
                  { height: barHeight },
                  highlighted ? styles.barActive : styles.barIdle,
                  d.value === 0 && styles.barEmpty,
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labelsRow}>
        {data.map((d, i) => (
          <View key={`lbl-${d.label}-${i}`} style={styles.col}>
            <Text style={styles.label} numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: {
    width: '78%',
    minHeight: 0,
  },
  /** Previous bars: darker gold so every bar reads on the dark background. */
  barIdle: { backgroundColor: 'rgba(255,215,0,0.35)' },
  barActive: { backgroundColor: theme.colors.gold },
  barEmpty: { backgroundColor: theme.colors.outline, opacity: 0.4 },
  value: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  valueLg: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 17,
    color: theme.colors.gold,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  valueSpacer: { height: 17 },
  valueSpacerLg: { height: 28 },
  labelsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
});
