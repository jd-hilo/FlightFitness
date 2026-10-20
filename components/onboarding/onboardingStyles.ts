import { StyleSheet } from 'react-native';

import { glassCard, theme } from '@/constants/theme';

/**
 * Post-auth shell screens are faith goals, first workout, and the two slides.
 * The paywall is the fourth screen and does not use the shell.
 */
export const ONBOARDING_STEP_COUNT = 4;

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
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: theme.colors.onBackground,
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 20,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  capHint: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.champagne,
    textAlign: 'center',
    marginBottom: 12,
  },
  chipsScroll: { flexGrow: 1, paddingBottom: 16 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
    backgroundColor: theme.colors.glass,
    maxWidth: '100%',
  },
  chipSelected: {
    borderColor: theme.colors.champagne,
    backgroundColor: theme.colors.champagneSoft,
  },
  chipText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.onBackground,
  },
  chipTextSelected: {
    fontFamily: theme.fonts.labelBold,
    color: theme.colors.champagne,
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
    ...glassCard,
    padding: 20,
    marginTop: 8,
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
  proofBody: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 16,
  },
});
