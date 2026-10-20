import { StyleSheet, Text, View } from 'react-native';

import { isScreenshotMode, SCREENSHOT_SAFE_TOP } from '@/lib/screenshotMode';

/** Fake iOS status bar: 9:41, full signal / wifi / battery, white glyphs. */
export function ScreenshotStatusBar() {
  if (!isScreenshotMode) return null;

  return (
    <View pointerEvents="none" style={styles.bar} accessibilityElementsHidden>
      <Text style={styles.time}>9:41</Text>
      <View style={styles.right}>
        <View style={styles.signal}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.barBit, { height: 4 + i * 2.2 }]} />
          ))}
        </View>
        <View style={styles.wifi}>
          <View style={styles.wifiArc} />
          <View style={[styles.wifiArc, styles.wifiMid]} />
          <View style={styles.wifiDot} />
        </View>
        <View style={styles.battery}>
          <View style={styles.batteryBody}>
            <View style={styles.batteryFill} />
          </View>
          <View style={styles.batteryNub} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREENSHOT_SAFE_TOP,
    zIndex: 9999,
    paddingTop: 14,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signal: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1.5,
    height: 11,
    marginRight: 2,
  },
  barBit: {
    width: 3,
    borderRadius: 0.8,
    backgroundColor: '#FFFFFF',
  },
  wifi: {
    width: 16,
    height: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginRight: 2,
  },
  wifiArc: {
    position: 'absolute',
    top: 0,
    width: 14,
    height: 7,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'transparent',
  },
  wifiMid: {
    top: 3,
    width: 9,
    height: 5,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  wifiDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    marginBottom: 0,
  },
  battery: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryBody: {
    width: 24,
    height: 11,
    borderRadius: 3,
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
    padding: 1,
  },
  batteryFill: {
    flex: 1,
    borderRadius: 1.4,
    backgroundColor: '#FFFFFF',
  },
  batteryNub: {
    width: 1.6,
    height: 4,
    marginLeft: 1,
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
    backgroundColor: '#FFFFFF',
  },
});
