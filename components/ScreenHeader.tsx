import type { ReactNode } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

const TITLE_FONT_SIZE = 20;
const TITLE_LETTER_SPACING = 0.8;

type Props = {
  title?: string;
  rightSlot?: ReactNode;
};

export function ScreenHeader({ title = 'FLIGHT FITNESS', rightSlot }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>
        <View
          style={styles.titleSide}
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${title}, Flight Fitness logo`}>
          <View style={styles.titleRow}>
            <Image
              source={require('../assets/images/header-logo.png')}
              style={[
                styles.logo,
                Platform.OS === 'ios' ? { tintColor: '#FFFFFF' } : null,
              ]}
              resizeMode="contain"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleSide: {
    flex: 1,
    alignItems: 'flex-start',
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
  },
  logo: {
    width: 38,
    height: 38,
  },
  titleText: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: theme.fonts.headline,
    fontSize: TITLE_FONT_SIZE,
    letterSpacing: TITLE_LETTER_SPACING,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  rightSlot: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
