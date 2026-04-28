import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { PlanFeatureRow } from '@/components/EssentialsPlanFeatureRow';
import { theme } from '@/constants/theme';
import { COACHING_FEATURES, ESSENTIALS_FEATURES } from '@/lib/coachingPlanCopy';
import type { SubscriptionTier } from '@/stores/subscriptionStore';

type Offer = 'essentials' | 'coaching';

type Props = {
  tier: SubscriptionTier;
  topPadding: number;
  bottomPadding: number;
  continueLabel?: string;
  showFreeWeek?: boolean;
  showHandle?: boolean;
  onEssentials: () => void;
  onCoaching: () => void;
  onFreeWeek?: () => void;
  onRestore: () => void;
  /** When true, main CTA shows a spinner (e.g. joining waitlist). */
  continueBusy?: boolean;
};

const APP_ICON = require('../assets/images/icon.png');

export function FlightUpgradeOffer({
  tier,
  topPadding,
  bottomPadding,
  continueLabel,
  showFreeWeek,
  showHandle = true,
  onEssentials,
  onCoaching,
  onFreeWeek,
  onRestore,
  continueBusy,
}: Props) {
  const [selected, setSelected] = useState<Offer>(
    tier === 'coaching' ? 'coaching' : 'essentials'
  );
  const coachingActive = tier === 'coaching';
  const essentialsActive = tier === 'essentials';
  const visibleBenefits =
    selected === 'coaching' ? COACHING_FEATURES : ESSENTIALS_FEATURES;

  const onContinue = () => {
    if (selected === 'coaching') {
      onCoaching();
      return;
    }
    onEssentials();
  };

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
          <Text style={styles.headline}>Unlock your full potential</Text>
          <Text style={styles.subhead}>Faith, fuel, and training without limits</Text>
        </View>

        <View style={styles.benefits}>
          {visibleBenefits.map((feature) => (
            <PlanFeatureRow key={feature.label} feature={feature} />
          ))}
        </View>

        <View style={styles.offerRow}>
          <Pressable
            style={[
              styles.offerCard,
              selected === 'essentials' && styles.offerCardSelected,
            ]}
            onPress={() => setSelected('essentials')}>
            <MaterialIcons
              name={selected === 'essentials' ? 'check-circle' : 'radio-button-unchecked'}
              size={22}
              color={selected === 'essentials' ? '#FFFFFF' : 'rgba(255,255,255,0.42)'}
              style={styles.offerCheck}
            />
            <View style={styles.offerTop}>
              <View style={styles.offerTitleCol}>
                <Text style={styles.offerName} numberOfLines={1} adjustsFontSizeToFit>
                  Essentials
                </Text>
                <Text style={styles.offerCaption}>Full app access</Text>
              </View>
            </View>
            <View style={styles.offerBottom}>
              <Text style={styles.offerPrice}>$2.99</Text>
              <Text style={styles.offerPeriod}>/week</Text>
            </View>
            <Text style={styles.offerNote}>{essentialsActive || coachingActive ? 'Included' : 'Auto-renewable'}</Text>
          </Pressable>

          <Pressable
            style={[
              styles.offerCard,
              selected === 'coaching' && styles.offerCardSelected,
            ]}
            onPress={() => setSelected('coaching')}>
            <MaterialIcons
              name={selected === 'coaching' ? 'check-circle' : 'radio-button-unchecked'}
              size={22}
              color={selected === 'coaching' ? '#FFFFFF' : 'rgba(255,255,255,0.42)'}
              style={styles.offerCheck}
            />
            <View style={styles.offerTop}>
              <View style={styles.offerTitleCol}>
                <Text style={styles.offerName} numberOfLines={2}>
                  Custom Coaching
                </Text>
                <Text style={styles.offerCaption}>Coach-led plan</Text>
              </View>
            </View>
            <View style={[styles.offerBottom, styles.offerBottomTight]}>
              <Text
                style={styles.offerPrice}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}>
                $199
              </Text>
              <Text
                style={styles.offerPeriod}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}>
                /month
              </Text>
            </View>
            <Text style={styles.offerNote}>
              {coachingActive ? "You're in" : 'At capacity — join waitlist'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.continueBtn,
            continueBusy && selected === 'coaching' && styles.continueBtnDisabled,
          ]}
          onPress={onContinue}
          disabled={Boolean(continueBusy && selected === 'coaching')}>
          {continueBusy && selected === 'coaching' ? (
            <AppLoadingCross size="small" />
          ) : (
            <Text style={styles.continueTxt}>
              {continueLabel ?? (selected === 'coaching' ? 'Join waitlist' : 'Continue')}
            </Text>
          )}
        </Pressable>

        {showFreeWeek && onFreeWeek ? (
          <Pressable style={styles.freeWeek} onPress={onFreeWeek} disabled={coachingActive}>
            <Text
              style={[styles.freeWeekTxt, styles.freeWeekTxtCenter]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.86}>
              Start with one free essentials week
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.legal}>
          Auto-renewable. Cancel anytime in App Store settings.
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
  benefits: {
    gap: 10,
    minHeight: 220,
    marginBottom: 22,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  offerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  offerCard: {
    flex: 1,
    minHeight: 146,
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
  offerCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  offerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingRight: 30,
    minHeight: 52,
  },
  offerTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  offerName: {
    fontFamily: theme.fonts.headline,
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 21,
    textTransform: 'uppercase',
  },
  offerCaption: {
    marginTop: 5,
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 14,
  },
  offerBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 18,
    minHeight: 31,
  },
  offerBottomTight: {
    minWidth: 0,
    flexShrink: 1,
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
  continueBtn: {
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    marginBottom: 14,
  },
  continueBtnDisabled: {
    opacity: 0.72,
  },
  continueTxt: {
    fontFamily: theme.fonts.headline,
    fontSize: 18,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  freeWeek: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  freeWeekTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.4,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  freeWeekTxtCenter: {
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
});
