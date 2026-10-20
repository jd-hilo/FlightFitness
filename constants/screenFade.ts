import { Easing } from 'react-native';

import { isScreenshotMode } from '@/lib/screenshotMode';

/** How long a newly opened screen takes to fade in. */
export const SCREEN_FADE_MS = isScreenshotMode ? 0 : 300;

export const stackFade = {
  animation: 'fade' as const,
  animationDuration: SCREEN_FADE_MS,
};

export const tabFade = {
  animation: 'fade' as const,
  transitionSpec: {
    animation: 'timing' as const,
    config: {
      duration: SCREEN_FADE_MS,
      easing: Easing.out(Easing.cubic),
    },
  },
};
