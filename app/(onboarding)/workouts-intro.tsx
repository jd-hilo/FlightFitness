import { Redirect, type Href } from 'expo-router';

/** Replaced by the first-set / first-rest aha. Keep this route for anyone mid-flow. */
export default function OnboardingWorkoutsIntroScreen() {
  return <Redirect href={'/(onboarding)/first-set' as Href} />;
}
