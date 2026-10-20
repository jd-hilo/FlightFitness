import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

export const sunriseImage = require('../assets/images/sunrise-bg.jpg');

const IMAGE_ASPECT = 1024 / 472;
const HORIZON_RATIO = 0.518;

type Props = {
  height: number;
  /** Pins the photo's horizon to this y offset (pt) inside the backdrop instead of centring it. */
  horizonY?: number;
  style?: ViewStyle;
  /** Black-to-clear wash at the top so the page header stays readable. */
  topScrim?: number;
};

/** Mountain sunrise photo that fades into the black page background. */
export function SunriseBackdrop({ height, horizonY, style, topScrim }: Props) {
  const { width } = useWindowDimensions();
  const imageHeight = width * IMAGE_ASPECT;
  const imageStyle =
    horizonY == null
      ? StyleSheet.absoluteFill
      : {
          position: 'absolute' as const,
          left: 0,
          width,
          height: imageHeight,
          top: horizonY - imageHeight * HORIZON_RATIO,
        };

  return (
    <View pointerEvents="none" style={[styles.wrap, { height }, style]}>
      <Image source={sunriseImage} resizeMode="cover" style={imageStyle} />
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.6)',
          'rgba(0,0,0,0.2)',
          'rgba(0,0,0,0.35)',
          theme.colors.background,
        ]}
        locations={[0, 0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      {topScrim ? (
        <LinearGradient
          colors={['#000000', '#000000', 'rgba(0,0,0,0)']}
          locations={[0, 0.42, 1]}
          style={[styles.topScrim, { height: topScrim }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
