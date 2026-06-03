import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { WeightLogEntry } from '@/stores/weightLogStore';

type Props = {
  entries: WeightLogEntry[];
  targetWeightLb?: number;
};

const PLOT_HEIGHT = 120;
const MAX_POINTS = 7;

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

function formatAxisDate(ymd: string) {
  if (ymd === 'start') return 'Start';
  return parseYmd(ymd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildYScale(weights: number[], targetWeightLb?: number) {
  const all = [...weights, ...(targetWeightLb != null ? [targetWeightLb] : [])];
  let min = Math.min(...all);
  let max = Math.max(...all);
  const rawSpan = max - min;
  const padding = Math.max(3, rawSpan * 0.15);
  min -= padding;
  max += padding;
  if (max - min < 8) {
    const mid = (Math.min(...all) + Math.max(...all)) / 2;
    min = mid - 4;
    max = mid + 4;
  }
  return { min, max, span: max - min };
}

type PlotPoint = {
  dateKey: string;
  weightLb: number;
  xRatio: number;
  yRatio: number;
};

function LineSegment({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 1) return null;
  // Dots use `bottom` (y up); CSS rotate is screen-space (y down), so flip dy.
  const angle = (Math.atan2(-dy, dx) * 180) / Math.PI;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.segment,
        {
          left: cx - length / 2,
          bottom: cy - 1,
          width: length,
          transform: [{ rotate: `${angle}deg` }],
        },
      ]}
    />
  );
}

export function WeightProgressChart({ entries, targetWeightLb }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [plotWidth, setPlotWidth] = useState(0);

  const points = useMemo(() => entries.slice(-MAX_POINTS), [entries]);

  const selected =
    points.find((p) => p.dateKey === selectedKey) ?? points[points.length - 1];

  const scale = useMemo(() => {
    if (points.length === 0) return null;
    return buildYScale(
      points.map((p) => p.weightLb),
      targetWeightLb
    );
  }, [points, targetWeightLb]);

  const plotPoints: PlotPoint[] = useMemo(() => {
    if (points.length === 0 || !scale) return [];
    return points.map((p, i) => ({
      dateKey: p.dateKey,
      weightLb: p.weightLb,
      xRatio: points.length === 1 ? 0.5 : i / (points.length - 1),
      yRatio: scale.span > 0 ? (p.weightLb - scale.min) / scale.span : 0.5,
    }));
  }, [points, scale]);

  const onPlotLayout = (e: LayoutChangeEvent) => {
    setPlotWidth(e.nativeEvent.layout.width);
  };

  if (points.length === 0) {
    return (
      <Text style={styles.empty}>Save a weigh-in to start tracking progress.</Text>
    );
  }

  const targetYRatio =
    scale && targetWeightLb != null && scale.span > 0
      ? (targetWeightLb - scale.min) / scale.span
      : null;

  const pixelPoints = plotPoints.map((p) => ({
    ...p,
    x: p.xRatio * plotWidth,
    y: p.yRatio * PLOT_HEIGHT,
  }));

  return (
    <View>
      {selected ? (
        <View style={styles.summary}>
          <Text style={styles.summaryWeight}>{selected.weightLb} lb</Text>
          <Text style={styles.summaryDate}>{formatAxisDate(selected.dateKey)}</Text>
        </View>
      ) : null}

      <View style={styles.plot} onLayout={onPlotLayout}>
        {targetYRatio != null ? (
          <View
            style={[styles.targetLine, { bottom: targetYRatio * PLOT_HEIGHT }]}
          />
        ) : null}

        {plotWidth > 0
          ? pixelPoints.slice(0, -1).map((p, i) => {
              const next = pixelPoints[i + 1]!;
              return (
                <LineSegment
                  key={`${p.dateKey}-${next.dateKey}`}
                  x1={p.x}
                  y1={p.y}
                  x2={next.x}
                  y2={next.y}
                />
              );
            })
          : null}

        {plotWidth > 0
          ? pixelPoints.map((p) => {
              const active = selected?.dateKey === p.dateKey;
              return (
                <Pressable
                  key={p.dateKey}
                  hitSlop={14}
                  onPress={() => setSelectedKey(p.dateKey)}
                  style={[styles.dotHit, { left: p.x - 14, bottom: p.y - 14 }]}>
                  <View style={[styles.dot, active && styles.dotActive]} />
                </Pressable>
              );
            })
          : null}
      </View>

      {plotWidth > 0 ? (
        <View style={styles.xLabels}>
          {plotPoints.map((p) => {
            const active = selected?.dateKey === p.dateKey;
            const left = Math.max(
              0,
              Math.min(plotWidth - 52, p.xRatio * plotWidth - 26)
            );
            return (
              <Pressable
                key={p.dateKey}
                onPress={() => setSelectedKey(p.dateKey)}
                style={[styles.xLabelCol, { left }]}>
                <Text style={[styles.xLabel, active && styles.xLabelActive]}>
                  {formatAxisDate(p.dateKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 16,
  },
  summaryWeight: {
    fontFamily: theme.fonts.headline,
    fontSize: 32,
    color: theme.colors.gold,
  },
  summaryDate: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  plot: {
    height: PLOT_HEIGHT,
    position: 'relative',
    overflow: 'visible',
    marginHorizontal: 6,
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.gold,
    opacity: 0.4,
    zIndex: 1,
  },
  segment: {
    position: 'absolute',
    height: 2,
    backgroundColor: theme.colors.gold,
    zIndex: 2,
  },
  dotHit: {
    position: 'absolute',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.colors.gold,
  },
  dotActive: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: theme.colors.gold,
    borderWidth: 2,
    borderColor: theme.colors.onBackground,
  },
  xLabels: {
    height: 20,
    marginTop: 8,
    position: 'relative',
  },
  xLabelCol: {
    position: 'absolute',
    width: 52,
    alignItems: 'center',
  },
  xLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  xLabelActive: {
    color: theme.colors.gold,
  },
});
