import { Redirect, type Href } from 'expo-router';

/** Demo rest loop removed — continue to the paywall. */
export default function OnboardingFirstRestScreen() {
  return <Redirect href={'/(onboarding)/upgrade-offer' as Href} />;
}
