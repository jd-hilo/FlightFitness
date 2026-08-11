import type { ReactNode } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

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
  logo: {
    width: 38,
    height: 38,
  },
  rightSlot: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
