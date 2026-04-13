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
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'train', label: 'Train', icon: 'fitness-center' },
  { name: 'fuel', label: 'Fuel', icon: 'restaurant' },
  { name: 'faith', label: 'Faith', icon: 'menu-book' },
  { name: 'elite', label: 'Profile', icon: 'person' },
];

export function FlightTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidBg]} />
      )}
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const label =
            (options.tabBarLabel as string) ?? options.title ?? route.name;
          const focused = state.index === index;
          const meta = ITEMS.find((i) => i.name === route.name);
          const icon = meta?.icon ?? 'circle';
          const short = meta?.label ?? label;

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
              style={[styles.item, focused && styles.itemActive]}>
              <MaterialIcons
                name={icon}
                size={24}
                color={focused ? theme.colors.gold : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.label, focused && styles.labelActive]}>
                {short}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  androidBg: {
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    opacity: 0.5,
  },
  itemActive: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  label: {
    fontFamily: theme.fonts.headline,
    fontSize: 9,
    marginTop: 4,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  labelActive: {
    color: theme.colors.gold,
    textShadowColor: 'rgba(255,215,0,0.35)',
    textShadowRadius: 8,
  },
});
