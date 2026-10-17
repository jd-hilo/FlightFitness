import { Redirect, type Href } from 'expo-router';

/** Sex, height, weight, macros, and the old demo screens are not on the live path. */
export function LegacyOnboardingRedirect() {
  return <Redirect href={'/(onboarding)/faith-goals' as Href} />;
}
