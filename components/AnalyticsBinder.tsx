import { usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';

import { bindAnalytics, registerSuperProps } from '@/lib/analytics';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export function AnalyticsBinder() {
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog) return;
    bindAnalytics(posthog);
    registerSuperProps({
      subscription_tier: useSubscriptionStore.getState().tier,
    });
  }, [posthog]);

  return null;
}
