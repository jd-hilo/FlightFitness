import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { theme } from '@/constants/theme';
import { hapticImpact, ImpactStyle } from '@/lib/haptics';

const SUNRISE = require('../../assets/images/sunrise-bg.jpg');

const REVIEWS = [
  {
    title: 'BEST FITNESS APP',
    who: 'Bellaoorlando · Aug 9, 2026',
    body: 'I started using this app as soon as it came to the App Store and it’s changed the game for working out. It keeps my workouts centered on mind body and spirit. Having my faith be a part of how I take care of myself and nurture body is SO important! I highly recommend!!',
  },
  {
    title: 'Love',
    who: 'Gracelahart · Aug 4, 2026',
    body: 'This app is amazing. Helps keep me on track with my fitness and spiritual goals. Love to have it all in one.',
  },
  {
    title: 'Great Training App!',
    who: 'ROOSTAA! · Aug 1, 2026',
    body: 'Excellent content and easy to navigate. A real Winner for those seeking advancing in physical, mental and spiritual health!',
  },
  {
    title: 'Pro Athlete approved',
    who: '813machine · Aug 7, 2026',
    body: 'This app is now my go to for training. Not only does it guide you physically but guides you spiritually and emotionally as well, and those are things the competition doesn’t focus on. FF Faith Meets Fitness helps me stay ahead of the game.',
  },
  {
    title: 'Busy mom',
    who: 'Monster902 · Aug 4, 2026',
    body: 'This app has become such a meaningful part of my daily routine. My favorite feature is the ability to truly reflect on the messages provided and thoughtfully apply them to my own life. It has been a wonderful tool for personal growth, helping me strive to be a better mother, daughter, and friend each day. I highly recommend it to anyone looking for a source of daily inspiration and spiritual encouragement.',
  },
] as const;

const LOOP = [...REVIEWS, ...REVIEWS];

export default function IntakeProofScreen() {
  const insets = useSafeAreaInsets();
  const drift = useRef(new Animated.Value(0)).current;
  const [loopWidth, setLoopWidth] = useState(0);

  useEffect(() => {
    if (loopWidth <= 0) return;
    drift.setValue(0);
    const animation = Animated.loop(
      Animated.timing(drift, {
        toValue: -loopWidth / 2,
        duration: 42000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [drift, loopWidth]);

  return (
    <View style={local.root}>
      <Image source={SUNRISE} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(0,0,0,0.62)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.38)', '#000000']}
        locations={[0, 0.34, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          local.foreground,
          { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 16 },
        ]}>
        <View>
          <Text style={local.title}>Closer, and stronger</Text>
          <Text style={local.subtitle}>
            People who train and study scripture say they feel closer to God, and stronger, within a
            few weeks.
          </Text>
        </View>

        <View style={local.reviewWrap}>
          <Animated.View
            style={[local.track, { transform: [{ translateX: drift }] }]}
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width;
              if (width > 0 && Math.abs(width - loopWidth) > 1) setLoopWidth(width);
            }}>
            {LOOP.map((review, index) => (
              <View key={`${review.title}-${index}`} style={local.review} accessibilityRole="text">
                <Text style={local.stars}>★★★★★</Text>
                <Text style={local.reviewTitle}>{review.title}</Text>
                <Text style={local.who}>{review.who}</Text>
                <Text style={local.body}>{review.body}</Text>
              </View>
            ))}
          </Animated.View>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={local.fadeLeft}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={local.fadeRight}
          />
        </View>

        <Pressable
          onPress={() => {
            hapticImpact(ImpactStyle.Light);
            router.push('/(onboarding)/faith-goals' as Href);
          }}
          style={styles.primary}
          accessibilityRole="button"
          accessibilityLabel="Continue">
          <Text style={styles.primaryTxt}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  foreground: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 8 },
    textShadowRadius: 24,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 14,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.78)',
  },
  reviewWrap: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: -16,
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
  },
  review: {
    width: 228,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stars: {
    color: theme.colors.champagne,
    letterSpacing: 2,
    fontSize: 12,
    marginBottom: 6,
  },
  reviewTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: '#fff',
    marginBottom: 4,
  },
  who: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.62)',
    marginBottom: 8,
  },
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.88)',
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
  },
});
