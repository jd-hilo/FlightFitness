/**
 * Shared marketing copy for Essentials, FF Custom Coaching (upgrade + paywall +
 * waitlist modal).
 */

/** Essentials is only offered as a weekly-renewing subscription (no monthly/yearly SKU). */
export const ESSENTIALS_WEEKLY_ONLY_CAPTION = 'Weekly subscription · full app access';

export const ESSENTIALS_MONTHLY_CAPTION = 'Monthly · full app access';
export const ESSENTIALS_MONTHLY_FOOTNOTE = 'Renews monthly · cancel anytime';
export const ESSENTIALS_MONTHLY_TRIAL_FOOTNOTE = '3-day free trial · then billed monthly';
export const ESSENTIALS_LIFETIME_CAPTION = 'Lifetime · full app access';
export const ESSENTIALS_LIFETIME_FOOTNOTE = 'Pay once · yours forever';

export const ESSENTIALS_FEATURES = [
  {
    icon: 'fitness-center',
    label: 'Unlimited saved workouts and meal plans.',
  },
  {
    icon: 'menu-book',
    label: 'Full verse rotation on rest timers.',
  },
  {
    icon: 'insights',
    label: 'Workout insights — progress, volume, and PRs.',
  },
  {
    icon: 'calendar-month',
    label: 'Plan meals and training for your week.',
  },
] as const;

export type EssentialsPlanFeature = (typeof ESSENTIALS_FEATURES)[number];

/** Rich cards on the Essentials paywall (scrollable showcase). */
export const ESSENTIALS_PAYWALL_HIGHLIGHTS = [
  {
    icon: 'fitness-center',
    title: 'Unlimited workout plans',
    description: 'Save as many workouts as you need — no caps on Free.',
  },
  {
    icon: 'restaurant',
    title: 'Unlimited saved meals',
    description: 'Build your fuel library without hitting the limit.',
  },
  {
    icon: 'menu-book',
    title: 'Full verses on rest',
    description: 'Rotate through up to 15 scriptures each workout.',
  },
  {
    icon: 'insights',
    title: 'Workout insights',
    description: 'See trends, volume, and strength progress over time.',
  },
] as const;

export type EssentialsPaywallHighlight = (typeof ESSENTIALS_PAYWALL_HIGHLIGHTS)[number];

export const COACHING_DESCRIPTION =
  'A real coach builds your meals and training for your life and walks with you toward strength in body and spirit.';

export const COACHING_FEATURES = [
  {
    icon: 'workspace-premium',
    label: 'Everything in Essentials, including insights and rest verses.',
  },
  {
    icon: 'auto-stories',
    label: 'Reflections from your coach for faith and habits.',
  },
  {
    icon: 'fitness-center',
    label: 'Faith-forward programming from your FF partner coach.',
  },
  {
    icon: 'chat-bubble',
    label: 'Message your coach when you need clarity or support.',
  },
] as const;

export type CoachingPlanFeature = (typeof COACHING_FEATURES)[number];

export const COACHING_WAITLIST_HINT =
  'Coaching seats are limited. Join the waitlist with your email and we will reach out when a spot opens.';

/** Detail screen for Custom Coaching. */
export const COACHING_INFO_HIGHLIGHTS = [
  {
    icon: 'person-search',
    title: 'Matched with your coach',
    description:
      'We pair you with an FF partner coach who fits your goals, schedule, and faith journey.',
  },
  {
    icon: 'fitness-center',
    title: 'Custom workouts',
    description:
      'Training built for your body and life — not a generic template. Updated as you progress.',
  },
  {
    icon: 'restaurant',
    title: 'Custom meal plans',
    description:
      'Fuel that matches your macros, preferences, and routine — planned with your coach.',
  },
  {
    icon: 'auto-stories',
    title: 'Faith-based practices',
    description:
      'Scripture, reflection, and habits woven in so body, mind, and spirit move together.',
  },
] as const;

/** Small print on the Essentials offer card when the user does not already have it. */
export const ESSENTIALS_RENEWAL_FOOTNOTE = 'Renews weekly · cancel anytime';
