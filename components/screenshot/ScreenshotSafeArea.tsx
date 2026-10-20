import type { ReactNode } from 'react';
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import {
  isScreenshotMode,
  SCREENSHOT_SAFE_BOTTOM,
  SCREENSHOT_SAFE_TOP,
} from '@/lib/screenshotMode';

const INSETS = {
  top: SCREENSHOT_SAFE_TOP,
  left: 0,
  right: 0,
  bottom: SCREENSHOT_SAFE_BOTTOM,
};

const FRAME = { x: 0, y: 0, width: 430, height: 932 };

export function ScreenshotSafeArea({ children }: { children: ReactNode }) {
  if (!isScreenshotMode) {
    return <SafeAreaProvider>{children}</SafeAreaProvider>;
  }

  return (
    <SafeAreaProvider initialMetrics={{ frame: FRAME, insets: INSETS }}>
      <SafeAreaInsetsContext.Provider value={INSETS}>
        <SafeAreaFrameContext.Provider value={FRAME}>{children}</SafeAreaFrameContext.Provider>
      </SafeAreaInsetsContext.Provider>
    </SafeAreaProvider>
  );
}
