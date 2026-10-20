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
    gold: '#EBD5AE',
    goldDim: '#D9BF93',
    goldSoft: 'rgba(235,213,174,0.14)',
    orange: '#FFA500',
    /** Soft warm accent used on the sunrise-styled Home, Faith, and Progress tabs. */
    champagne: '#EBD5AE',
    champagneSoft: 'rgba(235,213,174,0.16)',
    onChampagne: '#1A1408',
    metricBlue: '#8EA3E8',
    metricGreen: '#9CC79A',
    metricPurple: '#B79BE0',
    onGold: '#1A1408',
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
  /**
   * Shared type scale. Screen styles should reuse these instead of one-off sizes.
   * display — Home greeting name. pageTitle — Faith / Progress / Settings titles.
   * cardTitle — workout and Today titles. section — "Quick Actions" / "Recent".
   */
  type: {
    display: {
      fontFamily: 'Inter_800ExtraBold',
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.8,
    },
    pageTitle: {
      fontFamily: 'Inter_800ExtraBold',
      fontSize: 30,
      letterSpacing: -0.6,
    },
    cardTitle: {
      fontFamily: 'Inter_800ExtraBold',
      fontSize: 21,
      letterSpacing: -0.3,
    },
    section: {
      fontFamily: 'Inter_800ExtraBold',
      fontSize: 18,
      letterSpacing: -0.3,
    },
    body: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      lineHeight: 22,
    },
    bodyMedium: {
      fontFamily: 'Inter_500Medium',
      fontSize: 15,
      lineHeight: 21,
    },
    meta: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      lineHeight: 20,
    },
    caption: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 18,
    },
    kicker: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
      letterSpacing: 1.6,
    },
    button: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
    },
    buttonBold: {
      fontFamily: 'Inter_700Bold',
      fontSize: 16,
    },
    tab: {
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
    },
  },
  space: {
    screen: 16,
    section: 26,
    card: 16,
    gap: 12,
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
    primary: theme.colors.champagne,
    background: theme.colors.background,
    card: theme.colors.surfaceContainer,
    text: theme.colors.onBackground,
    border: theme.colors.outline,
    notification: theme.colors.champagne,
  },
};
