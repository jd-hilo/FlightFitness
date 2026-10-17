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
    paddingHorizontal: 24,
  },
  shellBody: {
    flex: 1,
    minHeight: 0,
  },
  brand: {
    fontFamily: theme.fonts.headline,
    fontSize: 15,
    letterSpacing: 0.5,
    color: theme.colors.onBackground,
    marginBottom: 16,
  },
  progressTrack: {
    height: 4,
    width: '100%',
    backgroundColor: theme.colors.glassStrong,
    borderRadius: theme.radii.full,
    overflow: 'hidden',
    marginBottom: 28,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radii.full,
  },
  title: {
    fontFamily: theme.fonts.headline,
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.8,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 20,
  },
  capHint: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.gold,
    marginBottom: 12,
  },
  chipsScroll: { flexGrow: 1, paddingBottom: 16 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
    backgroundColor: theme.colors.glass,
    maxWidth: '100%',
  },
  chipSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.goldSoft,
  },
  chipText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.onBackground,
  },
  chipTextSelected: {
    fontFamily: theme.fonts.labelBold,
    color: theme.colors.gold,
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
  sectionLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 10,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
    flex: 2,
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radii.full,
    paddingVertical: 17,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.4 },
  primaryTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: theme.colors.onGold,
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
    fontFamily: theme.fonts.headline,
    fontSize: 20,
    letterSpacing: -0.4,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
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
