import { useId, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { theme } from '@/constants/theme';

type Props = {
  points: number[];
  height?: number;
};

/** Smooth area line chart with a highlighted endpoint. */
export function TrendLine({ points, height = 90 }: Props) {
  const fillId = `trendFill${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const pad = 6;
  const max = Math.max(1, ...points);
  const min = Math.min(...points);
  const span = Math.max(1, max - min);
  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: pad + i * stepX,
    y: pad + (1 - (p - min) / span) * (height - pad * 2),
  }));

  let line = '';
  coords.forEach((c, i) => {
    if (i === 0) {
      line = `M ${c.x} ${c.y}`;
      return;
    }
    const prev = coords[i - 1]!;
    const midX = (prev.x + c.x) / 2;
    line += ` C ${midX} ${prev.y}, ${midX} ${c.y}, ${c.x} ${c.y}`;
  });
  const last = coords[coords.length - 1];
  const area =
    last && coords[0]
      ? `${line} L ${last.x} ${height} L ${coords[0].x} ${height} Z`
      : '';

  return (
    <View style={{ height }} onLayout={onLayout}>
      {width > 0 && last ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill={`url(#${fillId})`} />
          <Path d={line} stroke="rgba(255,255,255,0.75)" strokeWidth={2} fill="none" />
          <Circle cx={last.x} cy={last.y} r={5} fill={theme.colors.onBackground} />
        </Svg>
      ) : null}
    </View>
  );
}

type RingProps = {
  value: number;
  size?: number;
  color?: string;
  stroke?: number;
};

export function ProgressRing({
  value,
  size = 34,
  color = theme.colors.metricBlue,
  stroke = 3.5,
}: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
