export type CoachOnboarding = {
  profileComplete?: boolean;
  introVideo?: boolean;
  firstClient?: boolean;
  firstPlan?: boolean;
  firstReflection?: boolean;
  firstMessage?: boolean;
};

export type CoachRow = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  intro_video_url: string | null;
  intro_video_ready: boolean;
  onboarding: CoachOnboarding;
  invite_code: string | null;
  created_at?: string;
  updated_at?: string;
};

export const EMPTY_ONBOARDING: CoachOnboarding = {
  profileComplete: false,
  introVideo: false,
  firstClient: false,
  firstPlan: false,
  firstReflection: false,
  firstMessage: false,
};
