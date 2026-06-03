/** PostHog project API key — Project settings → Project API key (phc_...). */
export const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';

/** US cloud by default; set EXPO_PUBLIC_POSTHOG_HOST for EU. */
export const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export const posthogConfigured = Boolean(POSTHOG_API_KEY);
