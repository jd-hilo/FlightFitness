import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ScreenHeader } from '@/components/ScreenHeader';
import { theme } from '@/constants/theme';
import { getProfileSectionSummaries } from '@/lib/profileSectionSummaries';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useCompletionStore } from '@/stores/completionStore';
import { useFaithDailyStore } from '@/stores/faithDailyStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import {
  type SubscriptionTier,
  useSubscriptionStore,
} from '@/stores/subscriptionStore';

const TIER_ORDER: SubscriptionTier[] = ['free', 'essentials', 'coaching'];

const PLAN_META: Record<
  SubscriptionTier,
  { name: string; price: string; body: string }
> = {
  free: {
    name: 'Free',
    price: '$0',
    body: 'Core tracking and limited plan previews to get started.',
  },
  essentials: {
    name: 'Essentials',
    price: '$9.99/mo',
    body: 'Unlimited AI meal & workout plans, customization, grocery lists.',
  },
  coaching: {
    name: 'Coaching',
    price: '$199/mo',
    body: 'Jude: custom programming plus 1:1 messaging. Limited seats.',
  },
};

export default function EliteScreen() {
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);
  const tier = useSubscriptionStore((s) => s.tier);
  const setTier = useSubscriptionStore((s) => s.setTier);
  const resetDev = useSubscriptionStore((s) => s.resetDev);
  const answers = useOnboardingStore((s) => s.answers);
  const trainingStreak = useCompletionStore((s) => s.streak);
  const faithStreak = useFaithDailyStore((s) => s.faithStreak);

  const profileSections = getProfileSectionSummaries(answers);

  const otherPlanIds = useMemo(
    () => TIER_ORDER.filter((id) => id !== tier),
    [tier]
  );

  const onSignOut = () => {
    Alert.alert(
      'Sign out',
      supabaseConfigured
        ? 'Clears your cloud session on this device (anonymous sign-in). Your plan and onboarding answers stay on this phone until you reset them.'
        : 'Cloud session is not configured. You can still return to the welcome screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              if (supabase) {
                const { error } = await supabase.auth.signOut({ scope: 'local' });
                if (__DEV__ && error) {
                  console.warn('[signOut] local scope:', error.message);
                }
              }
            } finally {
              setSigningOut(false);
              router.replace('/welcome' as Href);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={40} color={theme.colors.gold} />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.displayName}>Your profile</Text>
          </View>
        </View>
        <Text style={styles.lead}>
          Membership, habits, and training identity in one place. Tap below to go
          deeper on plans and coaching.
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{trainingStreak}</Text>
            <Text style={styles.statLabel}>Training streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{faithStreak}</Text>
            <Text style={styles.statLabel}>Faith streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit>
              {tier.toUpperCase()}
            </Text>
            <Text style={styles.statLabel}>Plan tier</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Your plan inputs</Text>
        <Pressable
          style={styles.editProfileBtn}
          onPress={() => router.push('/profile-edit' as Href)}>
          <Text style={styles.editProfileBtnTxt}>Edit all choices</Text>
        </Pressable>
        <View style={styles.profileSectionsWrap}>
          {profileSections.map((sec) => (
            <View key={sec.title} style={styles.profileSectionCard}>
              <Text style={styles.profileSectionTitle}>{sec.title}</Text>
              {sec.lines.map((line, i) => (
                <Text key={i} style={styles.profileSectionLine}>
                  {line}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Membership</Text>
        <View style={styles.currentPlanCard}>
          <Text style={styles.currentBadge}>Your plan</Text>
          <Text style={styles.currentPlanTitle}>
            {PLAN_META[tier].name} — {PLAN_META[tier].price}
          </Text>
          <Text style={styles.currentPlanBody}>{PLAN_META[tier].body}</Text>
          <Pressable
            onPress={() => router.push('/paywall' as Href)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Manage or change plan">
            <Text style={styles.currentPlanLink}>Manage or change plan</Text>
          </Pressable>
        </View>

        <Text style={styles.otherPlansLabel}>Also available</Text>
        {otherPlanIds.map((planId, idx) => {
          const meta = PLAN_META[planId];
          const isLast = idx === otherPlanIds.length - 1;
          const mb = isLast ? styles.upgradeCardLast : styles.upgradeCardSpacer;
          const cta = planId === 'free' ? 'View plan' : 'Upgrade';
          return (
            <Pressable
              key={planId}
              style={[styles.card, mb]}
              onPress={() => router.push('/paywall' as Href)}
              accessibilityRole="button"
              accessibilityLabel={
                planId === 'free'
                  ? `View ${meta.name} plan`
                  : `Upgrade to ${meta.name}`
              }>
              <Text style={styles.cardTitleDark}>
                {meta.name} — {meta.price}
              </Text>
              <Text style={styles.cardBodyDark}>{meta.body}</Text>
              <Text style={styles.upgradeRowCta}>{cta}</Text>
            </Pressable>
          );
        })}

        <Text style={styles.sectionLabel}>Account</Text>
        <Pressable
          style={[styles.signOutBtn, signingOut && styles.signOutBtnDisabled]}
          onPress={onSignOut}
          disabled={signingOut}>
          <Text style={styles.signOutTxt}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Text>
        </Pressable>

        <Text style={styles.devLabel}>Developer</Text>
        <Text style={styles.devHint}>Simulate subscription tier for testing:</Text>
        <View style={styles.devRow}>
          <Pressable style={styles.devBtn} onPress={() => setTier('free')}>
            <Text style={styles.devBtnTxt}>Free</Text>
          </Pressable>
          <Pressable style={styles.devBtn} onPress={() => setTier('essentials')}>
            <Text style={styles.devBtnTxt}>Essentials</Text>
          </Pressable>
          <Pressable style={styles.devBtn} onPress={() => setTier('coaching')}>
            <Text style={styles.devBtnTxt}>Coaching</Text>
          </Pressable>
        </View>
        <Pressable onPress={resetDev}>
          <Text style={styles.resetTxt}>Reset subscription + free plan flag</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1 },
  displayName: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 22,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  lead: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 21,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
  },
  statVal: {
    fontFamily: theme.fonts.headline,
    fontSize: 20,
    color: theme.colors.gold,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 8,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  sectionLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: theme.colors.gold,
    padding: 20,
    marginBottom: 20,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  currentBadge: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 3,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  currentPlanTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 20,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  currentPlanBody: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 12,
  },
  currentPlanLink: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  otherPlansLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  upgradeCardSpacer: { marginBottom: 16 },
  upgradeCardLast: { marginBottom: 32 },
  upgradeRowCta: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  editProfileBtn: {
    borderWidth: 1,
    borderColor: theme.colors.gold,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  editProfileBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  profileSectionsWrap: { marginBottom: 20 },
  profileSectionCard: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 14,
    marginBottom: 12,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  profileSectionTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 12,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  profileSectionLine: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onBackground,
    lineHeight: 19,
    marginBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 24,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  cardTitleDark: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardBodyDark: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 16,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
  },
  signOutBtnDisabled: { opacity: 0.5 },
  signOutTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.error,
    textTransform: 'uppercase',
  },
  devLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  devHint: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 12,
  },
  devRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  devBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    alignItems: 'center',
  },
  devBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  resetTxt: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.error,
    textDecorationLine: 'underline',
    marginBottom: 24,
  },
});
