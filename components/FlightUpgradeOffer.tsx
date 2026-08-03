import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { theme } from '@/constants/theme';
import {
  ESSENTIALS_LIFETIME_FOOTNOTE,
  ESSENTIALS_MONTHLY_FOOTNOTE,
  ESSENTIALS_MONTHLY_TRIAL_FOOTNOTE,
  ESSENTIALS_PAYWALL_HIGHLIGHTS,
} from '@/lib/coachingPlanCopy';
import {
  FLIGHT_FITNESS_PRIVACY_POLICY_URL,
  FLIGHT_FITNESS_TERMS_OF_SERVICE_URL,
} from '@/lib/legalUrls';
import {
  fetchEssentialsOwnership,
  getRevenueCatEssentialsPackages,
  warmRevenueCatOfferings,
  type EssentialsOwnership,
  type EssentialsPurchasePlan,
} from '@/lib/revenueCat';
import { essentialsPaywallLegalCopy, type PaywallVariant } from '@/lib/subscriptionLegalCopy';
import type { SubscriptionTier } from '@/stores/subscriptionStore';

type Props = {
  tier: SubscriptionTier;
  topPadding: number;
  bottomPadding: number;
  continueLabel?: string;
  showHandle?: boolean;
  /** Onboarding: emphasize 3-day monthly trial CTA. */
  variant?: PaywallVariant;
  onEssentials: (plan: EssentialsPurchasePlan) => void;
  onCoachingInfo: () => void;
  onRestore: () => void;
  essentialsBusy?: boolean;
};

const APP_ICON = require('../assets/images/icon.png');
const FALLBACK_MONTHLY_PRICE = '$4.99';
const FALLBACK_LIFETIME_PRICE = '$99.99';
const EMPTY_OWNERSHIP: EssentialsOwnership = {
  hasMonthly: false,
  hasLifetime: false,
};

export function FlightUpgradeOffer({
  tier,
  topPadding,
  bottomPadding,
  continueLabel,
  showHandle = true,
  variant = 'default',
  onEssentials,
  onCoachingInfo,
  onRestore,
  essentialsBusy = false,
}: Props) {
  const [selected, setSelected] = useState<EssentialsPurchasePlan>(
    tier === 'essentials' ? 'lifetime' : 'monthly'
  );
  const [monthlyPrice, setMonthlyPrice] = useState(FALLBACK_MONTHLY_PRICE);
  const [lifetimePrice, setLifetimePrice] = useState(FALLBACK_LIFETIME_PRICE);
  const [ownership, setOwnership] = useState<EssentialsOwnership>(EMPTY_OWNERSHIP);

  const coachingActive = tier === 'coaching';
  // Monthly subscribers can still buy lifetime; lifetime / coaching lock Essentials CTAs.
  const monthlyLocked =
    coachingActive ||
    ownership.hasMonthly ||
    ownership.hasLifetime ||
    tier === 'essentials';
  const lifetimeLocked = coachingActive || ownership.hasLifetime;
  const purchaseLocked = selected === 'monthly' ? monthlyLocked : lifetimeLocked;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await warmRevenueCatOfferings();
      const [packages, nextOwnership] = await Promise.all([
        getRevenueCatEssentialsPackages(),
        fetchEssentialsOwnership(),
      ]);
      if (cancelled) return;
      if (packages.monthly?.product.priceString) {
        setMonthlyPrice(packages.monthly.product.priceString);
      }
      if (packages.lifetime?.product.priceString) {
        setLifetimePrice(packages.lifetime.product.priceString);
      }
      setOwnership(nextOwnership);
      // Already on monthly (or Essentials without lifetime): default to lifetime upgrade.
      if (
        (nextOwnership.hasMonthly || tier === 'essentials') &&
        !nextOwnership.hasLifetime
      ) {
        setSelected('lifetime');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tier]);

  const onContinue = () => {
    if (purchaseLocked) return;
    onEssentials(selected);
  };

  const isOnboarding = variant === 'onboarding';
  const monthlyFootnote =
    isOnboarding && !monthlyLocked
      ? ESSENTIALS_MONTHLY_TRIAL_FOOTNOTE
      : ESSENTIALS_MONTHLY_FOOTNOTE;

  const primaryCtaLabel = (() => {
    if (continueLabel) return continueLabel;
    if (purchaseLocked) return "You're in";
    if (selected === 'lifetime' && (ownership.hasMonthly || tier === 'essentials')) {
      return 'Get lifetime access';
    }
    if (isOnboarding && selected === 'monthly') return 'Start 3-day free trial';
    if (isOnboarding && selected === 'lifetime') return 'Get lifetime access';
    if (selected === 'lifetime') return 'Get lifetime access';
    return 'Upgrade to Essentials';
  })();

  const ctaSubtext =
    isOnboarding && selected === 'monthly' && !purchaseLocked
      ? `Then ${monthlyPrice}/month · cancel anytime`
      : null;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,215,0,0.12)', 'transparent']}
        locations={[0, 0.42, 1]}
        style={styles.topGlow}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.92)']}
        style={styles.bottomGlow}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding, paddingBottom: bottomPadding },
        ]}>
        <View style={styles.hero}>
          {showHandle ? <View style={styles.handle} /> : null}
          <View style={styles.logoFrame}>
            <Image source={APP_ICON} style={styles.logo} resizeMode="cover" />
          </View>
          <Text style={styles.headline}>
            {isOnboarding ? 'Try Essentials free' : 'Unlock your full potential'}
          </Text>
          <Text style={styles.subhead}>
            {isOnboarding
              ? '3 days on us — full access to workouts, meals, insights, and rest verses'
              : 'Faith, fuel, and training without limits'}
          </Text>
        </View>

        <View style={styles.showcase}>
          <Text style={styles.showcaseHeading}>What you unlock</Text>
          {ESSENTIALS_PAYWALL_HIGHLIGHTS.map((item) => (
            <View key={item.title} style={styles.showcaseCard}>
              <View style={styles.showcaseIconWrap}>
                <MaterialIcons name={item.icon} size={22} color={theme.colors.gold} />
              </View>
              <View style={styles.showcaseText}>
                <Text style={styles.showcaseTitle}>{item.title}</Text>
                <Text style={styles.showcaseDesc}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.essentialsHeading}>Upgrade to Essentials</Text>

        <View style={styles.offerRow}>
          <Pressable
            disabled={monthlyLocked}
            style={({ pressed }) => [
              styles.offerCard,
              selected === 'monthly' && !monthlyLocked && styles.offerCardSelected,
              monthlyLocked && styles.offerCardLocked,
              pressed && !monthlyLocked && styles.offerCardPressed,
            ]}
            onPress={() => setSelected('monthly')}>
            <MaterialIcons
              name={selected === 'monthly' ? 'check-circle' : 'radio-button-unchecked'}
              size={22}
              color={
                monthlyLocked
                  ? 'rgba(255,255,255,0.18)'
                  : selected === 'monthly'
                    ? '#FFFFFF'
                    : 'rgba(255,255,255,0.42)'
              }
              style={styles.offerCheck}
            />
            <View style={styles.offerTop}>
              <Text
                style={[styles.offerName, monthlyLocked && styles.offerTextMuted]}
                numberOfLines={1}>
                Monthly
              </Text>
            </View>
            <View style={styles.offerBottom}>
              <Text style={[styles.offerPrice, monthlyLocked && styles.offerTextMuted]}>
                {monthlyPrice}
              </Text>
              <Text
                style={[styles.offerPeriod, monthlyLocked && styles.offerCaptionMuted]}>
                /month
              </Text>
            </View>
            <Text style={[styles.offerNote, monthlyLocked && styles.offerNoteMuted]}>
              {monthlyLocked ? "You're in" : monthlyFootnote}
            </Text>
          </Pressable>

          <Pressable
            disabled={lifetimeLocked}
            style={({ pressed }) => [
              styles.offerCard,
              selected === 'lifetime' && !lifetimeLocked && styles.offerCardSelected,
              lifetimeLocked && styles.offerCardLocked,
              pressed && !lifetimeLocked && styles.offerCardPressed,
            ]}
            onPress={() => setSelected('lifetime')}>
            <MaterialIcons
              name={selected === 'lifetime' ? 'check-circle' : 'radio-button-unchecked'}
              size={22}
              color={
                lifetimeLocked
                  ? 'rgba(255,255,255,0.18)'
                  : selected === 'lifetime'
                    ? '#FFFFFF'
                    : 'rgba(255,255,255,0.42)'
              }
              style={styles.offerCheck}
            />
            <View style={styles.offerTop}>
              <Text
                style={[styles.offerName, lifetimeLocked && styles.offerTextMuted]}
                numberOfLines={1}>
                Lifetime
              </Text>
            </View>
            <View style={styles.offerBottom}>
              <Text
                style={[styles.offerPrice, lifetimeLocked && styles.offerTextMuted]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}>
                {lifetimePrice}
              </Text>
            </View>
            <Text style={[styles.offerNote, lifetimeLocked && styles.offerNoteMuted]}>
              {lifetimeLocked ? "You're in" : ESSENTIALS_LIFETIME_FOOTNOTE}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.coachingInfoCard,
            pressed && styles.coachingInfoPressed,
          ]}
          onPress={onCoachingInfo}
          accessibilityRole="button"
          accessibilityLabel="Custom Coaching, see more info">
          <View style={styles.coachingInfoText}>
            <Text style={styles.coachingInfoTitle}>Custom Coaching</Text>
            <Text style={styles.coachingInfoSub}>
              {coachingActive
                ? 'Your coach-led plan is active'
                : 'Coach-led workouts, meals, and faith practices'}
            </Text>
          </View>
          <View style={styles.coachingInfoAction}>
            <Text style={styles.coachingInfoLink}>
              {coachingActive ? 'Open' : 'See more info'}
            </Text>
            <MaterialIcons name="arrow-forward" size={16} color={theme.colors.gold} />
          </View>
        </Pressable>

        <Pressable
          style={[
            styles.continueBtn,
            (essentialsBusy || purchaseLocked) && styles.continueBtnDisabled,
          ]}
          onPress={onContinue}
          disabled={essentialsBusy || purchaseLocked}>
          {essentialsBusy ? (
            <AppLoadingCross size="small" />
          ) : (
            <>
              <Text style={styles.continueTxt}>{primaryCtaLabel}</Text>
              {ctaSubtext ? (
                <Text style={styles.continueSubtext}>{ctaSubtext}</Text>
              ) : null}
            </>
          )}
        </Pressable>

        <Text style={styles.legal}>
          {essentialsPaywallLegalCopy(selected, { variant, monthlyPrice })}
        </Text>

        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text
            style={styles.termsLink}
            accessibilityRole="link"
            accessibilityLabel="Terms of Service"
            onPress={() =>
              void WebBrowser.openBrowserAsync(FLIGHT_FITNESS_TERMS_OF_SERVICE_URL)
            }>
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text
            style={styles.termsLink}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
            onPress={() =>
              void WebBrowser.openBrowserAsync(FLIGHT_FITNESS_PRIVACY_POLICY_URL)
            }>
            Privacy Policy
          </Text>
          .
        </Text>

        <Pressable onPress={onRestore} style={styles.restoreWrap}>
          <Text style={styles.restore}>Restore purchases</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050505',
    overflow: 'hidden',
  },
  topGlow: {
    position: 'absolute',
    left: -60,
    right: -60,
    top: 0,
    height: 380,
  },
  bottomGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
  },
  scrollContent: {
    paddingHorizontal: 22,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  handle: {
    width: 54,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.76)',
    marginBottom: 26,
  },
  logoFrame: {
    width: 92,
    height: 92,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#111',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  headline: {
    fontFamily: theme.fonts.headline,
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
  },
  subhead: {
    marginTop: 6,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.58)',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  showcase: {
    gap: 10,
    marginBottom: 22,
  },
  showcaseHeading: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2.4,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  showcaseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  showcaseIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.22)',
  },
  showcaseText: {
    flex: 1,
    minWidth: 0,
  },
  showcaseTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    lineHeight: 18,
    marginBottom: 4,
  },
  showcaseDesc: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.58)',
    lineHeight: 18,
  },
  essentialsHeading: {
    fontFamily: theme.fonts.headline,
    fontSize: 18,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  offerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  offerCard: {
    flex: 1,
    minHeight: 132,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    paddingHorizontal: 14,
    paddingVertical: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  offerCardSelected: {
    borderColor: 'rgba(255,255,255,0.82)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  offerCardLocked: {
    opacity: 0.38,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  offerCardPressed: {
    opacity: 0.92,
  },
  offerTextMuted: {
    color: 'rgba(255,255,255,0.35)',
  },
  offerCaptionMuted: {
    color: 'rgba(255,255,255,0.28)',
  },
  offerNoteMuted: {
    color: 'rgba(255,255,255,0.4)',
  },
  offerCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  offerTop: {
    paddingRight: 30,
    minHeight: 28,
  },
  offerName: {
    fontFamily: theme.fonts.headline,
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 21,
    textTransform: 'uppercase',
  },
  offerBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 14,
    minHeight: 31,
  },
  offerPrice: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 24,
    color: '#FFFFFF',
    lineHeight: 29,
  },
  offerPeriod: {
    marginBottom: 4,
    marginLeft: 3,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  offerNote: {
    marginTop: 6,
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.56)',
    lineHeight: 14,
  },
  coachingInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.22)',
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  coachingInfoPressed: {
    opacity: 0.9,
  },
  coachingInfoText: {
    flex: 1,
    minWidth: 0,
  },
  coachingInfoTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 15,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  coachingInfoSub: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 16,
  },
  coachingInfoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  coachingInfoLink: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  continueBtn: {
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    marginBottom: 14,
    gap: 4,
  },
  continueBtnDisabled: {
    opacity: 0.72,
  },
  continueTxt: {
    fontFamily: theme.fonts.headline,
    fontSize: 17,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  continueSubtext: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.58)',
    textAlign: 'center',
  },
  restoreWrap: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  restore: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
  },
  legal: {
    marginTop: 8,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.48)',
    textAlign: 'center',
    lineHeight: 17,
  },
  terms: {
    marginTop: 10,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.48)',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 6,
  },
  termsLink: {
    color: theme.colors.gold,
    textDecorationLine: 'underline',
  },
});
