import { isScreenshotMode, SCREENSHOT_LOCAL } from '@/lib/screenshotMode';

/**
 * Freeze `new Date()` / `Date.now()` to Tue 7:12 AM local so greetings
 * and "today" keys stay stable. `new Date(value)` still parses real timestamps.
 */
export function installScreenshotClock() {
  if (!isScreenshotMode) return;
  const g = globalThis as typeof globalThis & { __SCREENSHOT_CLOCK__?: boolean };
  if (g.__SCREENSHOT_CLOCK__) return;

  const frozenMs = new Date(
    SCREENSHOT_LOCAL.year,
    SCREENSHOT_LOCAL.month,
    SCREENSHOT_LOCAL.day,
    SCREENSHOT_LOCAL.hour,
    SCREENSHOT_LOCAL.minute,
    0,
    0
  ).getTime();

  const RealDate = Date;

  class ScreenshotDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(frozenMs);
      } else {
        // @ts-expect-error Date constructor overloads
        super(...args);
      }
    }

    static now() {
      return frozenMs;
    }
  }

  g.Date = ScreenshotDate as unknown as DateConstructor;
  g.__SCREENSHOT_CLOCK__ = true;
}

installScreenshotClock();
