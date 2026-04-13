import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FlightTabBar } from '@/components/FlightTabBar';
import { VerseCelebrationModal } from '@/components/VerseCelebrationModal';
import { theme } from '@/constants/theme';
import { useVerseModalStore } from '@/stores/verseModalStore';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const visible = useVerseModalStore((s) => s.visible);
  const verse = useVerseModalStore((s) => s.verse);
  const reflection = useVerseModalStore((s) => s.reflection);
  const hide = useVerseModalStore((s) => s.hide);

  return (
    <View style={styles.flex}>
      <Tabs
        tabBar={(props) => <FlightTabBar {...props} />}
        screenOptions={{
          headerShown: useClientOnlyValue(false, false),
        }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="train" options={{ title: 'Train' }} />
        <Tabs.Screen name="fuel" options={{ title: 'Fuel' }} />
        <Tabs.Screen name="faith" options={{ title: 'Faith' }} />
        <Tabs.Screen name="elite" options={{ title: 'Profile' }} />
      </Tabs>
      <VerseCelebrationModal
        visible={visible}
        verse={verse}
        reflection={reflection ?? undefined}
        onClose={hide}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
});
