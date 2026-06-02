import { Redirect } from 'expo-router';

/** Legacy route — split into about-sex, about-age, about-height. */
export default function AboutYouRedirect() {
  return <Redirect href="/(onboarding)/about-sex" />;
}
