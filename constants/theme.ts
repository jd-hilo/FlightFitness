import { DarkTheme } from '@react-navigation/native';

export const theme = {
  colors: {
    background: '#000000',
    onBackground: '#e2e2e2',
    surface: '#000000',
    surfaceContainer: '#111111',
    surfaceContainerLow: '#121212',
    surfaceContainerHigh: '#1a1a1a',
    surfaceVariant: '#2a2a2a',
    onSurface: '#e2e2e2',
    onSurfaceVariant: '#c6c9ab',
    outline: 'rgba(255,255,255,0.1)',
    outlineStrong: 'rgba(255,255,255,0.05)',
    gold: '#FFD700',
    goldDim: '#e9c400',
    orange: '#FFA500',
    onGold: '#000000',
    error: '#ffb4ab',
    inverseOnSurface: '#303030',
  },
  fonts: {
    headline: 'Epilogue_900Black_Italic',
    headlineBold: 'Epilogue_900Black',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    label: 'Epilogue_700Bold',
  },
  radii: {
    none: 0,
    full: 9999,
  },
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
