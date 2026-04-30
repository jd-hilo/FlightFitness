import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { FlightTabBar } from '@/components/FlightTabBar';
import { VerseCelebrationModal } from '@/components/VerseCelebrationModal';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { theme } from '@/constants/theme';
import { pullProfileFirstNameIntoStore } from '@/lib/api/profileFirstName';
import { ensureCurrentWeekPlan } from '@/lib/ensureCurrentWeekPlan';
import { useStoresHydrated } from '@/lib/hydration';
import { PlanRemoteRealtimeSync } from '@/lib/planRemoteRealtime';
import { supabaseConfigured } from '@/lib/supabase';
import { useRegisteredAuth } from '@/lib/useRegisteredAuth';
import { useCoachChatStore } from '@/stores/coachChatStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useVerseModalStore } from '@/stores/verseModalStore';

function CoachChatRealtimeSync() {
  const tier = useSubscriptionStore((s) => s.tier);
  const bindRealtime = useCoachChatStore((s) => s.bindRealtime);
  useEffect(() => {
    if (tier !== 'coaching' || !supabaseConfigured) return;
    return bindRealtime();
  }, [tier, bindRealtime]);
  return null;
}

export default function TabLayout() {
  const hydrated = useStoresHydrated();
  const { ready: authReady, registered } = useRegisteredAuth();

  useEffect(() => {
    if (!hydrated) return;
    void ensureCurrentWeekPlan();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !registered || !supabaseConfigured) return;
    void pullProfileFirstNameIntoStore();
  }, [hydrated, registered]);

  const visible = useVerseModalStore((s) => s.visible);
  const verse = useVerseModalStore((s) => s.verse);
  const reflection = useVerseModalStore((s) => s.reflection);
  const hide = useVerseModalStore((s) => s.hide);

  if (!authReady) {
    return (
      <View style={styles.authGate}>
        <AppLoadingCross size="large" />
      </View>
    );
  }

  if (!registered) {
    return <Redirect href="/welcome" />;
  }

  return (
    <View style={styles.flex}>
      <CoachChatRealtimeSync />
      {supabaseConfigured ? <PlanRemoteRealtimeSync /> : null}
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
  authGate: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
