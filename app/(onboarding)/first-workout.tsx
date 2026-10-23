import { Redirect, type Href } from 'expo-router';

/** First-workout picker is no longer in the live path. */
export default function FirstWorkoutScreen() {
  return <Redirect href={'/(onboarding)/feature-slides' as Href} />;
}
