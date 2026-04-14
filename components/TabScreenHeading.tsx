import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  /** Screen title shown on the left, e.g. Train or Fuel. */
  title: string;
};

export function TabScreenHeading({ title }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontFamily: theme.fonts.headline,
    fontSize: 36,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
});
