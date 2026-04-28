import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  feature: {
    icon: ComponentProps<typeof MaterialIcons>['name'];
    label: string;
  };
};

export function PlanFeatureRow({ feature }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.iconCol}>
        <MaterialIcons name={feature.icon} size={22} color={theme.colors.gold} />
      </View>
      <Text style={styles.text} numberOfLines={2}>
        {feature.label}
      </Text>
    </View>
  );
}

export const EssentialsPlanFeatureRow = PlanFeatureRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 46,
  },
  iconCol: {
    width: 28,
    alignItems: 'center',
    paddingTop: 2,
  },
  text: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onBackground,
    lineHeight: 22,
  },
});
