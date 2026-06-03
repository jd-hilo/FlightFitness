import {
  Epilogue_700Bold,
  Epilogue_900Black,
  Epilogue_900Black_Italic,
} from '@expo-google-fonts/epilogue';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import { useEffect, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { PostHogScreenTracker } from '@/components/PostHogScreenTracker';
import { AnalyticsBinder } from '@/components/AnalyticsBinder';
import { navigationDarkTheme, theme } from '@/constants/theme';
import {
  POSTHOG_API_KEY,
  POSTHOG_HOST,
  posthogConfigured,
} from '@/lib/posthog';
import { useRevenueCatSubscriptionSync } from '@/lib/revenueCat';
import { usePostHogUserSync } from '@/lib/usePostHogUserSync';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function PostHogUserSync() {
  usePostHogUserSync();
  return null;
}

function PostHogRoot({ children }: { children: ReactNode }) {
  if (!posthogConfigured) return children;

  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: POSTHOG_HOST,
      }}
      autocapture={{
        captureScreens: false,
        captureTouches: true,
      }}>
      <PostHogScreenTracker />
      <AnalyticsBinder />
      <PostHogUserSync />
      {children}
    </PostHogProvider>
  );
}

export default function RootLayout() {
  useRevenueCatSubscriptionSync();

  const [loaded, error] = useFonts({
    Epilogue_700Bold,
    Epilogue_900Black,
    Epilogue_900Black_Italic,
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded) return;
    void SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <PostHogRoot>
        <ThemeProvider value={navigationDarkTheme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="email-sign-in" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="workout-session" options={{ headerShown: false }} />
            <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
            <Stack.Screen
              name="grocery"
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Grocery list',
                headerStyle: { backgroundColor: '#000' },
                headerTintColor: '#FFD700',
              }}
            />
            <Stack.Screen
              name="paywall"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="profile-edit"
              options={{
                headerShown: true,
                title: 'Edit profile',
                headerStyle: { backgroundColor: '#000' },
                headerTintColor: '#FFD700',
                headerBackTitle: '',
                headerBackButtonDisplayMode: 'minimal',
                headerTitleStyle: {
                  fontFamily: 'Epilogue_700Bold',
                },
              }}
            />
            <Stack.Screen
              name="coach-chat"
              options={{
                headerShown: true,
                title: 'Coach Jude',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.gold,
                headerBackTitle: '',
                /** iOS: chevron only, no label beside the back button */
                headerBackButtonDisplayMode: 'minimal',
                headerTitleStyle: {
                  fontFamily: 'Epilogue_700Bold',
                },
              }}
            />
          </Stack>
        </ThemeProvider>
      </PostHogRoot>
    </SafeAreaProvider>
  );
}
