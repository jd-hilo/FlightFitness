import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { isCurrentUserOnCoachingWaitlist } from '@/lib/api/coachingWaitlist';
import {
  COACHING_DESCRIPTION,
  ESSENTIALS_MONTHLY_CAPTION,
  ESSENTIALS_MONTHLY_FOOTNOTE,
} from '@/lib/coachingPlanCopy';
import {
  getEssentialsMonthlyPriceLabel,
  warmRevenueCatOfferings,
} from '@/lib/revenueCat';
import type { SubscriptionTier } from '@/stores/subscriptionStore';

type Props = {
  tier: SubscriptionTier;
  onUpgrade: () => void;
  onCoaching: () => void;
};

export function ProfileUpgradeBanner({ tier, onUpgrade, onCoaching }: Props) {
  const [monthlyPrice, setMonthlyPrice] = useState('$4.99');
  const [coachingWaitlistJoined, setCoachingWaitlistJoined] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await warmRevenueCatOfferings();
      const price = await getEssentialsMonthlyPriceLabel();
      if (!cancelled && price) setMonthlyPrice(price);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tier !== 'essentials') return;
    let cancelled = false;
    void (async () => {
      const on = await isCurrentUserOnCoachingWaitlist();
      if (!cancelled) setCoachingWaitlistJoined(on);
    })();
    return () => {
      cancelled = true;
    };
  }, [tier]);

  if (tier === 'coaching') return null;

  if (tier === 'free') {
    return (
      <Pressable
        style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
        onPress={onUpgrade}
        accessibilityRole="button"
        accessibilityLabel="Upgrade to Essentials">
        <LinearGradient
          colors={['rgba(255,255,255,0.14)', 'rgba(255,215,0,0.10)', 'rgba(255,255,255,0.04)']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}>
          <View style={styles.topRow}>
            <View style={styles.titleCol}>
              <Text style={styles.kicker}>Unlock your full potential</Text>
              <Text style={styles.name}>Essentials</Text>
              <Text style={styles.caption}>{ESSENTIALS_MONTHLY_CAPTION}</Text>
            </View>
            <View style={styles.iconBadge}>
              <MaterialIcons name="bolt" size={22} color={theme.colors.gold} />
            </View>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{monthlyPrice}</Text>
            <Text style={styles.period}>/month</Text>
          </View>
          <Text style={styles.lead}>
            Unlimited workouts and meals, weekly planning, grocery lists, and daily faith —
            without limits.
          </Text>
          <View style={styles.ctaRow}>
            <Text style={styles.cta}>Upgrade now</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.note}>{ESSENTIALS_MONTHLY_FOOTNOTE}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      onPress={onCoaching}
      accessibilityRole="button"
      accessibilityLabel={
        coachingWaitlistJoined ? 'Custom coaching waitlist joined' : 'Join custom coaching waitlist'
      }>
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,215,0,0.14)', 'rgba(255,255,255,0.05)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <View style={styles.topRow}>
          <View style={styles.titleCol}>
            <Text style={styles.kicker}>Next level</Text>
            <Text style={styles.name}>Custom Coaching</Text>
            <Text style={styles.caption}>Coach-led plan</Text>
          </View>
          {coachingWaitlistJoined ? (
            <View style={styles.waitlistPill}>
              <MaterialIcons name="check" size={12} color={theme.colors.gold} />
              <Text style={styles.waitlistPillTxt}>Joined</Text>
            </View>
          ) : (
            <View style={styles.iconBadge}>
              <MaterialIcons name="workspace-premium" size={22} color={theme.colors.gold} />
            </View>
          )}
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>$199</Text>
          <Text style={styles.period}>/month</Text>
        </View>
        <Text style={styles.lead}>{COACHING_DESCRIPTION}</Text>
        <View style={styles.ctaRow}>
          <Text style={styles.cta}>
            {coachingWaitlistJoined ? 'View coaching' : 'Join waitlist'}
          </Text>
          <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
        </View>
        <Text style={styles.note}>
          {coachingWaitlistJoined
            ? 'You’re on the list — we’ll reach out when a spot opens'
            : 'At capacity — join the waitlist for a faith-forward coach'}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  gradient: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 2.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  name: {
    fontFamily: theme.fonts.headline,
    fontSize: 22,
    color: '#FFFFFF',
    lineHeight: 26,
    textTransform: 'uppercase',
  },
  caption: {
    marginTop: 5,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitlistPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.45)',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  waitlistPillTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  price: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 30,
    color: '#FFFFFF',
    lineHeight: 34,
  },
  period: {
    marginBottom: 5,
    marginLeft: 4,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  lead: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 16,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  cta: {
    fontFamily: theme.fonts.headline,
    fontSize: 15,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  note: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.48)',
    lineHeight: 15,
    textAlign: 'center',
  },
});
