import { DarkTheme } from '@react-navigation/native';

export const theme = {
  colors: {
    background: '#000000',
    onBackground: '#F2F2F2',
    surface: '#000000',
    surfaceContainer: '#121212',
    surfaceContainerLow: '#0E0E0E',
    surfaceContainerHigh: '#1C1C1E',
    surfaceVariant: '#2A2A2C',
    onSurface: '#F2F2F2',
    onSurfaceVariant: '#9A9A9F',
    outline: 'rgba(255,255,255,0.10)',
    outlineStrong: 'rgba(255,255,255,0.18)',
    glass: 'rgba(255,255,255,0.06)',
    glassStrong: 'rgba(255,255,255,0.10)',
    glassEdge: 'rgba(255,255,255,0.12)',
    gold: '#FFD700',
    goldDim: '#E9C400',
    goldSoft: 'rgba(255,215,0,0.14)',
    orange: '#FFA500',
    onGold: '#000000',
    error: '#FF6B5E',
    inverseOnSurface: '#303030',
  },
  fonts: {
    /** Heavy uppercase display: hero titles, big numbers. */
    headline: 'Inter_900Black',
    /** Section titles and card titles. */
    headlineBold: 'Inter_800ExtraBold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    /** Buttons, chips, kickers. */
    label: 'Inter_600SemiBold',
    labelBold: 'Inter_700Bold',
  },
  radii: {
    none: 0,
    sm: 12,
    md: 20,
    lg: 28,
    full: 9999,
  },
} as const;

/** Shared glass card surface: translucent fill, hairline edge, large radius. */
export const glassCard = {
  backgroundColor: theme.colors.glass,
  borderWidth: 1,
  borderColor: theme.colors.glassEdge,
  borderRadius: theme.radii.lg,
} as const;

/** Rounded chip, Ladder-style filter pill. */
export const glassChip = {
  backgroundColor: theme.colors.glassStrong,
  borderWidth: 1,
  borderColor: theme.colors.glassEdge,
  borderRadius: theme.radii.full,
} as const;

export const navigationDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: theme.colors.gold,
    background: theme.colors.background,
    card: theme.colors.surfaceContainer,
    text: theme.colors.onBackground,
    border: theme.colors.outline,
    notification: theme.colors.gold,
  },
};
