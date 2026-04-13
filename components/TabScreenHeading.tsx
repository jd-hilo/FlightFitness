import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  /** Screen title shown on the left, e.g. Train or Fuel. */
  title: string;
};

/** Section title row with upgrade badge → paywall (not the profile tab). */
export function TabScreenHeading({ title }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      <Pressable
        style={styles.badge}
        onPress={() => router.push('/paywall')}
        accessibilityRole="button"
        accessibilityLabel="Upgrade your wellbeing. Opens upgrade options.">
        <MaterialIcons name="workspace-premium" size={16} color={theme.colors.gold} />
        <View style={styles.badgeTextCol}>
          <Text style={styles.badgeTop}>UPGRADE</Text>
          <Text style={styles.badgeBottom}>your wellbeing</Text>
        </View>
      </Pressable>
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  badgeTextCol: {
    alignItems: 'flex-start',
  },
  badgeTop: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: theme.colors.gold,
  },
  badgeBottom: {
    fontFamily: theme.fonts.body,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
});
