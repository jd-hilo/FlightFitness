import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  /** Screen title shown on the left, e.g. Train or Fuel. */
  title: string;
  /** Optional content aligned to the right (e.g. upgrade badge). */
  rightSlot?: ReactNode;
};

export function TabScreenHeading({ title, rightSlot }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {rightSlot != null ? (
        <View style={styles.rightSlot}>{rightSlot}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: theme.fonts.headline,
    fontSize: 36,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  rightSlot: {
    flexShrink: 0,
    maxWidth: '52%',
    alignItems: 'flex-end',
  },
});
