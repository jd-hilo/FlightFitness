import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { theme } from '@/constants/theme';
import { hapticImpact, ImpactStyle } from '@/lib/haptics';

const SUNRISE = require('../../assets/images/sunrise-bg.jpg');

type Review = { title: string; who: string; body: string };

const REVIEWS: readonly Review[] = [
  {
    title: 'BEST FITNESS APP',
    who: 'Bellaoorlando',
    body: 'It’s changed the game for working out. It keeps my workouts centered on mind, body and spirit. Having my faith be a part of how I take care of myself is SO important!',
  },
  {
    title: 'Love',
    who: 'Gracelahart',
    body: 'This app is amazing. Helps keep me on track with my fitness and spiritual goals. Love to have it all in one.',
  },
  {
    title: 'Great Training App!',
    who: 'ROOSTAA!',
    body: 'Excellent content and easy to navigate. A real winner for those seeking to advance in physical, mental and spiritual health!',
  },
  {
    title: 'Pro Athlete approved',
    who: '813machine',
    body: 'Now my go-to for training. It guides you physically, spiritually and emotionally, and those are things the competition doesn’t focus on.',
  },
  {
    title: 'Busy mom',
    who: 'Monster902',
    body: 'Such a meaningful part of my daily routine. It has helped me strive to be a better mother, daughter, and friend each day.',
  },
];

const TOP_ROW = [REVIEWS[0], REVIEWS[2], REVIEWS[4]];
const BOTTOM_ROW = [REVIEWS[3], REVIEWS[1]];

const CARD_WIDTH = 264;
const CARD_GAP = 12;

function ReviewRow({
  reviews,
  pxPerSecond,
  reverse = false,
}: {
  reviews: readonly Review[];
  pxPerSecond: number;
  reverse?: boolean;
}) {
  const drift = useRef(new Animated.Value(0)).current;
  const [loopWidth, setLoopWidth] = useState(0);
  const loop = [...reviews, ...reviews];

  useEffect(() => {
    if (loopWidth <= 0) return;
    const half = loopWidth / 2;
    const from = reverse ? -half : 0;
    const to = reverse ? 0 : -half;
    drift.setValue(from);
    const animation = Animated.loop(
      Animated.timing(drift, {
        toValue: to,
        duration: (half / pxPerSecond) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [drift, loopWidth, pxPerSecond, reverse]);

  return (
    <View style={local.rowClip}>
      <Animated.View
        style={[local.track, { transform: [{ translateX: drift }] }]}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          if (width > 0 && Math.abs(width - loopWidth) > 1) setLoopWidth(width);
        }}>
        {loop.map((review, index) => (
          <View key={`${review.who}-${index}`} style={local.card}>
            <View style={local.cardHead}>
              <Text style={local.stars}>★★★★★</Text>
              <Text style={local.who} numberOfLines={1}>
                {review.who}
              </Text>
            </View>
            <Text style={local.cardTitle} numberOfLines={1}>
              {review.title}
            </Text>
            <Text style={local.cardBody} numberOfLines={4}>
              {review.body}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function useRise(delay: number) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 650,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 650,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, opacity, translateY]);
  return { opacity, transform: [{ translateY }] };
}

export default function IntakeProofScreen() {
  const insets = useSafeAreaInsets();
  const line1 = useRise(100);
  const line2 = useRise(260);
  const line3 = useRise(420);
  const rest = useRise(620);

  return (
    <View style={local.root}>
      <Image source={SUNRISE} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(0,0,0,0.72)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.5)', '#000000']}
        locations={[0, 0.38, 0.66, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          local.foreground,
          { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 16 },
        ]}>
        <View style={local.hero}>
          <Animated.Text style={[local.headline, line1]}>Closer to God.</Animated.Text>
          <Animated.Text style={[local.headline, line2]}>Stronger.</Animated.Text>
          <Animated.Text style={[local.headline, local.headlineAccent, line3]}>
            In 2 weeks.
          </Animated.Text>
          <Animated.Text style={[local.subtitle, rest]}>
            That’s what people tell us after pairing their training with time in the Word.
          </Animated.Text>
        </View>

        <Animated.View style={[local.reviews, rest]}>
          <View style={local.ratingRow}>
            <Text style={local.ratingStars}>★★★★★</Text>
            <Text style={local.ratingTxt}>Loved by our members</Text>
          </View>
          <ReviewRow reviews={TOP_ROW} pxPerSecond={46} />
          <ReviewRow reviews={BOTTOM_ROW} pxPerSecond={38} reverse />
        </Animated.View>

        <Pressable
          onPress={() => {
            hapticImpact(ImpactStyle.Light);
            router.push('/(onboarding)/faith-goals' as Href);
          }}
          style={({ pressed }) => [styles.primary, pressed && local.pressed]}
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
    paddingHorizontal: 20,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  hero: {
    gap: 0,
  },
  headline: {
    fontFamily: theme.fonts.headline,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -1.4,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 20,
  },
  headlineAccent: {
    color: theme.colors.champagne,
  },
  subtitle: {
    marginTop: 14,
    maxWidth: 320,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.8)',
  },
  reviews: {
    marginHorizontal: -20,
    gap: CARD_GAP,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  ratingStars: {
    color: theme.colors.champagne,
    fontSize: 14,
    letterSpacing: 2,
  },
  ratingTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  rowClip: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  card: {
    width: CARD_WIDTH,
    height: 150,
    marginRight: CARD_GAP,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(14,12,10,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  stars: {
    color: theme.colors.champagne,
    letterSpacing: 2,
    fontSize: 12,
  },
  who: {
    flexShrink: 1,
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  cardTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: '#fff',
    marginBottom: 4,
  },
  cardBody: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.85)',
  },
});
