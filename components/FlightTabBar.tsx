import { BlurView } from 'expo-blur';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

const ITEMS: {
  name: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  activeIcon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { name: 'index', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'train', label: 'Train', icon: 'dumbbell', activeIcon: 'dumbbell' },
  { name: 'faith', label: 'Faith', icon: 'cross-outline', activeIcon: 'cross' },
  { name: 'elite', label: 'Progress', icon: 'chart-bar', activeIcon: 'chart-bar' },
];

export function FlightTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
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
          const color = focused ? theme.colors.champagne : 'rgba(255,255,255,0.55)';

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
              accessibilityLabel={meta.label}
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.item}>
              <MaterialCommunityIcons
                name={focused ? meta.activeIcon : meta.icon}
                size={24}
                color={color}
              />
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(8,8,9,0.78)',
    overflow: 'hidden',
  },
  androidBg: {
    backgroundColor: 'rgba(8,8,9,0.97)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  label: {
    ...theme.type.tab,
  },
});
