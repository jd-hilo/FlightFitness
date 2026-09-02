import { Redirect, type Href } from 'expo-router';

/** Demo set/rest loop removed — continue to the paywall. */
export default function OnboardingFirstSetScreen() {
  return <Redirect href={'/(onboarding)/upgrade-offer' as Href} />;
}
