import { isScreenshotMode, SCREENSHOT_LOCAL } from '@/lib/screenshotMode';

/**
 * Freeze `Date.now()` / `new Date()` to Tue 7:12 AM local so greetings
 * and "today" keys stay stable. Returns real Date instances so
 * `toISOString()` and other native methods keep working.
 */
export function installScreenshotClock() {
  if (!isScreenshotMode) return;
  const g = globalThis as typeof globalThis & { __SCREENSHOT_CLOCK__?: boolean };
  if (g.__SCREENSHOT_CLOCK__) return;

  const RealDate = Date;
  const frozenMs = new RealDate(
    SCREENSHOT_LOCAL.year,
    SCREENSHOT_LOCAL.month,
    SCREENSHOT_LOCAL.day,
    SCREENSHOT_LOCAL.hour,
    SCREENSHOT_LOCAL.minute,
    0,
    0
  ).getTime();

  function ScreenshotDate(this: Date, ...args: unknown[]) {
    const inner =
      args.length === 0
        ? new RealDate(frozenMs)
        : new (RealDate as unknown as new (...a: unknown[]) => Date)(...args);
    if (new.target) return inner;
    return inner.toString();
  }

  ScreenshotDate.now = () => frozenMs;
  ScreenshotDate.parse = RealDate.parse.bind(RealDate);
  ScreenshotDate.UTC = RealDate.UTC.bind(RealDate);
  ScreenshotDate.prototype = RealDate.prototype;
  Object.setPrototypeOf(ScreenshotDate, RealDate);

  g.Date = ScreenshotDate as unknown as DateConstructor;
  g.__SCREENSHOT_CLOCK__ = true;
}

installScreenshotClock();
