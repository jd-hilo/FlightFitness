import { LinearGradient } from 'expo-linear-gradient';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  coachingActive: boolean;
};

const LOGO = require('../assets/images/header-logo.png');

/**
 * Branded header for the FF Custom Coaching tier on paywall / upgrade flows.
 * Uses the same mark as the app header (`header-logo.png`).
 */
export function CoachingTierHero({ coachingActive }: Props) {
  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={['#030303', '#121216', '#26262c']}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <View style={styles.row}>
          <View style={styles.leftBlock}>
            <Image
              source={LOGO}
              style={[styles.logo, Platform.OS === 'ios' ? { tintColor: '#FFFFFF' } : null]}
              resizeMode="contain"
              accessibilityLabel="Flight Fitness logo"
            />
            <View style={styles.textCol}>
              {coachingActive ? (
                <Text style={styles.eyebrow}>Current plan</Text>
              ) : null}
              <Text style={styles.headline} accessibilityRole="header">
                FF Custom Coaching
              </Text>
            </View>
          </View>
          {!coachingActive ? (
            <View style={styles.waitlistTag} accessibilityLabel="Waitlist">
              <Text style={styles.waitlistTagTxt}>Waitlist</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginBottom: 18,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.55,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
      default: {},
    }),
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minWidth: 0,
  },
  logo: {
    width: 52,
    height: 52,
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headline: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: '#f2f2f4',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  waitlistTag: {
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.45)',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  waitlistTagTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
});
