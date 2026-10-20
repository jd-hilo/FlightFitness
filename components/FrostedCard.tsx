import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  /** Adds the warm top-down sheen used on hero cards. */
  glow?: boolean;
};

const WARM_GLOW = ['rgba(235,213,174,0.16)', 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.18)'] as const;
const TILE_SHEEN = ['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.025)'] as const;

/** Frosted glass panel for content that sits on top of the sunrise photo. */
export function FrostedCard({ children, style, intensity = 28, glow = false }: Props) {
  return (
    <View style={[styles.card, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidFill]} />
      )}
      {glow ? (
        <LinearGradient
          colors={WARM_GLOW}
          locations={[0, 0.55, 1]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

type TileProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Dark tile with a faint diagonal sheen, lighter at the top-left. */
export function SheenTile({ children, style }: TileProps) {
  return (
    <View style={[styles.sheenTile, style]}>
      <LinearGradient
        colors={TILE_SHEEN}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  androidFill: {
    backgroundColor: 'rgba(28,26,24,0.82)',
  },
  sheenTile: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
});

export const frostedTile = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.09)',
  borderRadius: 20,
} as const;

export const pageTitleStyle = {
  ...theme.type.pageTitle,
  color: theme.colors.onBackground,
} as const;
