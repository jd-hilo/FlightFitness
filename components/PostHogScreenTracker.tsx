import { useGlobalSearchParams, usePathname } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useMemo } from 'react';

/** Manual screen tracking for expo-router (React Navigation v7 disables autocapture screens). */
export function PostHogScreenTracker() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const posthog = usePostHog();
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  useEffect(() => {
    if (!pathname) return;
    posthog.screen(pathname, params);
  }, [pathname, paramsKey, posthog, params]);

  return null;
}
