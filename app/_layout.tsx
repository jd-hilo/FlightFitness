import '@/lib/screenshotClock';

import {
  Epilogue_400Regular,
  Epilogue_600SemiBold,
  Epilogue_700Bold,
} from '@expo-google-fonts/epilogue';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import { useEffect, type ReactNode } from 'react';
import 'react-native-reanimated';

import { DevotionalNotificationSync } from '@/components/DevotionalNotificationSync';
import { PostHogScreenTracker } from '@/components/PostHogScreenTracker';
import { AnalyticsBinder } from '@/components/AnalyticsBinder';
import { ScreenshotSafeArea } from '@/components/screenshot/ScreenshotSafeArea';
import { ScreenshotStatusBar } from '@/components/screenshot/ScreenshotStatusBar';
import { stackFade } from '@/constants/screenFade';
import { navigationDarkTheme, theme } from '@/constants/theme';
import {
  POSTHOG_API_KEY,
  POSTHOG_HOST,
  posthogConfigured,
} from '@/lib/posthog';
import { useRevenueCatSubscriptionSync } from '@/lib/revenueCat';
import { applyScreenshotFixtures } from '@/lib/screenshotBootstrap';
import { useStoresHydrated } from '@/lib/hydration';
import { isScreenshotMode } from '@/lib/screenshotMode';
import { usePostHogUserSync } from '@/lib/usePostHogUserSync';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function PostHogUserSync() {
  usePostHogUserSync();
  return null;
}

function ScreenshotBootstrap() {
  const hydrated = useStoresHydrated();
  useEffect(() => {
    if (!isScreenshotMode || !hydrated) return;
    applyScreenshotFixtures();
  }, [hydrated]);
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
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    ...(isScreenshotMode
      ? {
          Epilogue_400Regular,
          Epilogue_600SemiBold,
          Epilogue_700Bold,
        }
      : {}),
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
    <ScreenshotSafeArea>
      <PostHogRoot>
        <ThemeProvider value={navigationDarkTheme}>
          <StatusBar style="light" />
          <DevotionalNotificationSync />
          <ScreenshotBootstrap />
          <ScreenshotStatusBar />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#000' },
              ...stackFade,
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="email-sign-in" />
            {/* No swipe-back out of intake or onboarding into the screen behind them. */}
            <Stack.Screen name="(intake)" options={{ gestureEnabled: false }} />
            <Stack.Screen name="(onboarding)" options={{ gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
            <Stack.Screen name="workout-session" options={{ headerShown: false }} />
            <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
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
                headerTintColor: '#EBD5AE',
                headerBackTitle: '',
                headerBackButtonDisplayMode: 'minimal',
                headerTitleStyle: {
                  fontFamily: theme.fonts.labelBold,
                },
              }}
            />
            <Stack.Screen
              name="coach-chat"
              options={{
                headerShown: true,
                title: 'Coach Jude',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.champagne,
                headerBackTitle: '',
                /** iOS: chevron only, no label beside the back button */
                headerBackButtonDisplayMode: 'minimal',
                headerTitleStyle: {
                  fontFamily: theme.fonts.labelBold,
                },
              }}
            />
          </Stack>
        </ThemeProvider>
      </PostHogRoot>
    </ScreenshotSafeArea>
  );
}
