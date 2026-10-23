import { StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';

/**
 * Faith goals is the only post-auth screen that uses the shell.
 * The transformation page and the paywall follow it without a progress bar.
 */
export const ONBOARDING_STEP_COUNT = 1;

/** Pre-auth questions: fitness goal, lifting, faith tenure, age. */
export const INTAKE_STEP_COUNT = 4;

export const onboardingStyles = StyleSheet.create({
  kavRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
  },
  shellBody: {
    flex: 1,
    minHeight: 0,
  },
  brand: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: theme.colors.glassStrong,
    borderRadius: theme.radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.champagne,
    borderRadius: theme.radii.full,
  },
  title: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
    textAlign: 'left',
    marginBottom: 6,
    marginTop: 12,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    textAlign: 'left',
    marginBottom: 22,
  },
  capHint: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.champagne,
    textAlign: 'left',
    marginBottom: 12,
    marginTop: -10,
  },
  chipsScroll: { flexGrow: 1, paddingBottom: 16 },
  choiceList: {
    gap: 10,
  },
  choiceRow: {
    minHeight: 60,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  choiceRowSelected: {
    borderColor: theme.colors.champagne,
    backgroundColor: 'rgba(235,213,174,0.14)',
  },
  choiceRowPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  choiceRowDisabled: { opacity: 0.35 },
  choiceLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 17,
    letterSpacing: -0.2,
    color: theme.colors.onBackground,
  },
  choiceLabelSelected: {
    fontFamily: theme.fonts.label,
  },
  choiceCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCheckOn: {
    borderColor: theme.colors.champagne,
    backgroundColor: theme.colors.champagne,
  },
  chip: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    maxWidth: '100%',
  },
  chipSelected: {
    borderColor: 'rgba(235,213,174,0.45)',
    backgroundColor: 'rgba(235,213,174,0.08)',
  },
  chipText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  chipTextSelected: {
    fontFamily: theme.fonts.label,
    color: theme.colors.onBackground,
  },
  textField: {
    minHeight: 56,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
    backgroundColor: theme.colors.glass,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 20,
    color: theme.colors.onBackground,
  },
  weightScroll: { flexGrow: 1 },
  /** Small-caps kicker above section content. */
  sectionLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 10,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  footer: {
    marginTop: 12,
  },
  secondary: {
    flex: 1,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
    backgroundColor: theme.colors.glass,
    paddingVertical: 17,
    alignItems: 'center',
  },
  secondaryTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  disabled: { opacity: 0.3 },
  primary: {
    backgroundColor: theme.colors.champagne,
    borderRadius: theme.radii.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  primaryTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: theme.colors.onChampagne,
  },
  primaryTxtDisabled: {
    color: theme.colors.onSurfaceVariant,
  },
  macroFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  macroLabel: {
    flex: 1,
    fontFamily: theme.fonts.label,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  macroInput: {
    width: 100,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
    backgroundColor: theme.colors.glass,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.onBackground,
    textAlign: 'right',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
  },
  infoTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
    marginBottom: 10,
  },
  infoBody: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onBackground,
    lineHeight: 22,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 16,
  },
});
