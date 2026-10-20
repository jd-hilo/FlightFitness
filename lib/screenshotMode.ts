/** Gated App Store screenshot harness. Never true in production builds. */
export const isScreenshotMode = process.env.EXPO_PUBLIC_SCREENSHOT_MODE === '1';

/** Frozen local clock for greeting ("Good morning,") — status bar still shows 9:41. */
export const SCREENSHOT_LOCAL = {
  year: 2026,
  month: 9,
  day: 20,
  hour: 7,
  minute: 12,
} as const;

export const SCREENSHOT_SAFE_TOP = 54;
export const SCREENSHOT_SAFE_BOTTOM = 34;

export function displayBrandName(): string {
  return isScreenshotMode ? 'Fortify' : 'Flight';
}

export function displayAppName(): string {
  return isScreenshotMode ? 'Fortify' : 'Flight Fitness';
}

export function screenshotSearchParam(
  key: string
): string | undefined {
  if (!isScreenshotMode) return undefined;
  if (typeof window === 'undefined') return undefined;
  try {
    return new URL(window.location.href).searchParams.get(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function markScreenshotReady() {
  if (!isScreenshotMode) return;
  if (typeof window === 'undefined') return;
  (window as unknown as { __SCREENSHOT_READY__?: boolean }).__SCREENSHOT_READY__ = true;
}
