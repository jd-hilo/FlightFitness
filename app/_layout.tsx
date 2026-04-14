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
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { navigationDarkTheme } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationDarkTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
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
              headerBackTitleVisible: false,
              headerTitleStyle: {
                fontFamily: 'Epilogue_700Bold',
                textTransform: 'uppercase',
              },
            }}
          />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
