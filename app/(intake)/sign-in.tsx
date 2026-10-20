import { Redirect, type Href } from 'expo-router';

/** Sign-in now lives on the welcome slideshow. Keep this route from stranding old links. */
export default function IntakeSignInScreen() {
  return <Redirect href={'/welcome' as Href} />;
}
