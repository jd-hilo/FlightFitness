import type PostHog from 'posthog-react-native';

/** Where the user opened subscription / paywall UI. */
export type PaywallSource =
  | 'onboarding'
  | 'train_gate'
  | 'fuel_gate'
  | 'coach_chat'
  | 'badge'
  | 'elite'
  | 'unknown';

/** JSON-safe event properties for PostHog capture. */
export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | string[] | undefined
>;

let client: PostHog | null = null;

export function bindAnalytics(instance: PostHog): void {
  client = instance;
}

export function track(event: string, props?: AnalyticsProps): void {
  if (props) {
    client?.capture(event, props as Parameters<PostHog['capture']>[1]);
    return;
  }
  client?.capture(event);
}

export function registerSuperProps(props: AnalyticsProps): void {
  client?.register(props as Parameters<PostHog['register']>[0]);
}

export function unregisterSuperProp(key: string): void {
  client?.unregister(key);
}

export function trackPlanGenerated(params: {
  source: 'onboarding' | 'ensure_week' | 'regenerate';
  success: boolean;
  durationMs: number;
  wasMock: boolean;
}): void {
  track('plan generated', {
    source: params.source,
    success: params.success,
    duration_ms: params.durationMs,
    was_mock: params.wasMock,
  });
}

export function paywallHref(source: PaywallSource): `/paywall?source=${PaywallSource}` {
  return `/paywall?source=${source}`;
}
