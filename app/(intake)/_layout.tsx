import { Stack } from 'expo-router';

import { stackFade } from '@/constants/screenFade';

/**
 * Questions asked before an account exists.
 * The (onboarding) group still requires a registered user, so these screens stay here.
 */
export default function IntakeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000' },
        ...stackFade,
      }}
    />
  );
}
