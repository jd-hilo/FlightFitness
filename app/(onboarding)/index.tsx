import { Redirect, type Href } from 'expo-router';

export default function OnboardingIndex() {
  return <Redirect href={'/(onboarding)/faith-goals' as Href} />;
}
