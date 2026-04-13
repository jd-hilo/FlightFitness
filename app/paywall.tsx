import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { buildMockWeekPlan } from '@/lib/mockPlan';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import {
  type SubscriptionTier,
  useSubscriptionStore,
} from '@/stores/subscriptionStore';

const ESSENTIALS_FEATURES = [
  'Unlimited AI meal & training weeks',
  'Regenerate days, swaps, and macro tools',
  'Grocery lists tied to your plan',
] as const;

const COACHING_FEATURES = [
  'Everything in Essentials',
  'Jude: custom monthly programming',
  'Direct messaging with your coach',
] as const;

/** Mock coach headshot for paywall — swap for a bundled asset or CMS URL in production. */
const MOCK_COACH_JUDE_URI =
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=320&h=400&fit=crop&q=80';

function FeatureRow({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <MaterialIcons name="check-circle" size={20} color={theme.colors.gold} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const tier = useSubscriptionStore((s) => s.tier);
  const setTier = useSubscriptionStore((s) => s.setTier);
  const answers = useOnboardingStore((s) => s.answers);
  const setFromWeekPlan = usePlanStore((s) => s.setFromWeekPlan);

  const notNowToHome = useCallback(() => {
    if (!usePlanStore.getState().weekStart) {
      setFromWeekPlan(buildMockWeekPlan(answers));
    }
    router.replace('/(tabs)');
  }, [answers, setFromWeekPlan]);

  const selectTier = useCallback(
    (next: SubscriptionTier) => {
      if (next === 'free') return;
      setTier(next);
      router.back();
    },
    [setTier]
  );

  const onRestore = useCallback(() => {
    Alert.alert(
      'Restore purchases',
      'Hook up RevenueCat or StoreKit restore here. In this build, use Elite → dev controls to change tier.'
    );
  }, []);

  const essentialsOnly = tier === 'essentials';
  const coachingActive = tier === 'coaching';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(255, 215, 0, 0.12)', 'transparent']}
        style={styles.heroGlow}
        pointerEvents="none"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 28,
          },
        ]}>
          <Text style={styles.kicker}>FLIGHT FITNESS</Text>
          <Text style={styles.headline}>Train and fuel without limits</Text>
          <Text style={styles.subhead}>
            Your first full AI week is free. Subscribe for unlimited plans,
            customization, and grocery lists—or add coaching when you are ready
            to go all in.
          </Text>

          <View style={[styles.planCard, styles.planCardFeatured]}>
            {essentialsOnly ? (
              <View style={styles.activePill}>
                <Text style={styles.activePillTxt}>Current</Text>
              </View>
            ) : coachingActive ? (
              <View style={styles.activePill}>
                <Text style={styles.activePillTxt}>Included</Text>
              </View>
            ) : (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>Most popular</Text>
              </View>
            )}
            <Text style={styles.planName}>Essentials</Text>
            <Text style={styles.planPrice}>
              $9.99<Text style={styles.planPeriod}>/month</Text>
            </Text>
            <View style={styles.featureBlock}>
              {ESSENTIALS_FEATURES.map((f) => (
                <FeatureRow key={f} text={f} />
              ))}
            </View>
            <Pressable
              style={[
                styles.primaryBtn,
                (essentialsOnly || coachingActive) && styles.btnMuted,
              ]}
              onPress={() => selectTier('essentials')}
              disabled={essentialsOnly || coachingActive}>
              <Text
                style={[
                  styles.primaryBtnTxt,
                  (essentialsOnly || coachingActive) && styles.primaryBtnTxtMuted,
                ]}>
                {coachingActive
                  ? 'Included with Coaching'
                  : essentialsOnly
                    ? 'Included in your plan'
                    : 'Subscribe to Essentials'}
              </Text>
            </Pressable>
            <Text style={styles.devNote}>
              Simulated purchase — replace with RevenueCat / native billing.
            </Text>
          </View>

          <View style={[styles.planCard, styles.planCardCoaching]}>
            <View style={styles.coachPremiumRow}>
              <View style={styles.profileOval}>
                <Image
                  source={{ uri: MOCK_COACH_JUDE_URI }}
                  style={styles.profileOvalImage}
                  accessibilityLabel="Coach Jude profile preview"
                />
              </View>
              <View style={styles.coachPremiumRight}>
                {coachingActive ? (
                  <View style={[styles.activePill, styles.activePillInRow]}>
                    <Text style={styles.activePillTxt}>Current plan</Text>
                  </View>
                ) : (
                  <View style={styles.premiumBadgeOval}>
                    <Text style={styles.premiumBadgeTxt}>
                      Unlock Custom Plans from Coach Jude
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.planName}>Coaching</Text>
            <Text style={styles.planPrice}>
              $199<Text style={styles.planPeriod}>/month</Text>
            </Text>
            <Text style={styles.coachingHint}>
              Limited capacity. Jude builds your month around you.
            </Text>
            <View style={styles.featureBlock}>
              {COACHING_FEATURES.map((f) => (
                <FeatureRow key={f} text={f} />
              ))}
            </View>
            <Pressable
              style={[
                styles.outlineBtn,
                coachingActive && styles.btnMutedOutline,
              ]}
              onPress={() => selectTier('coaching')}
              disabled={coachingActive}>
              <Text
                style={[
                  styles.outlineBtnTxt,
                  coachingActive && styles.outlineBtnTxtMuted,
                ]}>
                {coachingActive ? 'You have Coaching' : 'Subscribe to Coaching'}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={onRestore} style={styles.restoreWrap}>
            <Text style={styles.restore}>Restore purchases</Text>
          </Pressable>

          <Pressable onPress={notNowToHome} style={styles.notNowWrap}>
            <Text style={styles.notNow}>Not now</Text>
          </Pressable>

          <Text style={styles.legal}>
            Subscriptions renew until canceled. Manage in App Store settings.
          </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  heroGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 200,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 3,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  headline: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 26,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    lineHeight: 30,
    marginBottom: 12,
  },
  subhead: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 28,
  },
  planCard: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 20,
    marginBottom: 16,
  },
  planCardFeatured: {
    borderColor: 'rgba(255, 215, 0, 0.35)',
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  planCardCoaching: {
    paddingTop: 18,
  },
  coachPremiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 14,
  },
  profileOval: {
    width: 86,
    height: 108,
    borderRadius: 43,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.surfaceVariant,
  },
  profileOvalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coachPremiumRight: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  premiumBadgeOval: {
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.55)',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  premiumBadgeTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 0.4,
    color: theme.colors.gold,
    textAlign: 'center',
    lineHeight: 17,
  },
  activePillInRow: {
    alignSelf: 'stretch',
    marginBottom: 0,
    alignItems: 'center',
    borderRadius: 9999,
    paddingVertical: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  badgeTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  activePill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.gold,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  activePillTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  planName: {
    fontFamily: theme.fonts.headline,
    fontSize: 22,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  planPrice: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 28,
    color: theme.colors.onBackground,
    marginBottom: 16,
  },
  planPeriod: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'none',
  },
  coachingHint: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginTop: -8,
    marginBottom: 16,
  },
  featureBlock: {
    gap: 12,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onBackground,
    lineHeight: 22,
    paddingTop: 1,
  },
  primaryBtn: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
  },
  btnMuted: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  primaryBtnTxtMuted: {
    color: theme.colors.onSurfaceVariant,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: theme.colors.gold,
    paddingVertical: 16,
    alignItems: 'center',
  },
  outlineBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  btnMutedOutline: {
    borderColor: theme.colors.outline,
  },
  outlineBtnTxtMuted: {
    color: theme.colors.onSurfaceVariant,
  },
  devNote: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: 12,
    lineHeight: 16,
  },
  restoreWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  restore: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  notNowWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  notNow: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
  },
  legal: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 16,
    opacity: 0.85,
  },
});
