import { BlurView } from 'expo-blur';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

const ITEMS: {
  name: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { name: 'index', label: 'Fitness', icon: 'fitness-center' },
  { name: 'faith', label: 'Faith', icon: 'menu-book' },
  { name: 'elite', label: 'Profile', icon: 'person' },
];

export function FlightTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom - 8, 10) }]}>
      <View style={styles.wrap}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidBg]} />
      )}
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const meta = ITEMS.find((i) => i.name === route.name);
          const hidden = (options as { href?: string | null }).href === null;
          if (!meta || hidden) return null;
          const focused = state.index === index;
          const icon = meta.icon;
          const short = meta.label;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.item}>
              <View style={[styles.iconChip, focused && styles.iconChipActive]}>
                <MaterialIcons
                  name={icon}
                  size={22}
                  color={focused ? theme.colors.onGold : theme.colors.onSurfaceVariant}
                />
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>
                {short}
              </Text>
            </Pressable>
          );
        })}
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
  },
  wrap: {
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,20,22,0.72)',
  },
  androidBg: {
    backgroundColor: 'rgba(20,20,22,0.96)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    gap: 3,
  },
  iconChip: {
    width: 40,
    height: 32,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: {
    backgroundColor: theme.colors.gold,
  },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  labelActive: {
    color: theme.colors.onBackground,
  },
});
