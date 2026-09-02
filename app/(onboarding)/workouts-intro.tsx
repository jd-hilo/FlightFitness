import { Redirect, type Href } from 'expo-router';

/** Demo training intro removed — continue to the paywall. */
export default function OnboardingWorkoutsIntroScreen() {
  return <Redirect href={'/(onboarding)/upgrade-offer' as Href} />;
}
