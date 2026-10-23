import { useCallback, useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';
import { weightLbValues } from '@/lib/onboardingOptions';

const VALUES = weightLbValues();
const ITEM_HEIGHT = 36;
const PICKER_HEIGHT = 180;
const PAD = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

type Props = {
  label: string;
  hint?: string;
  value: number;
  onChange: (lb: number) => void;
};

/** iOS-style wheel picker for bodyweight. */
export function WeightPicker({ label, hint, value, onChange }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const safe =
    value >= VALUES[0]! && value <= VALUES[VALUES.length - 1]! ? value : VALUES[0]!;

  const scrollToLb = useCallback((lb: number, animated: boolean) => {
    const i = VALUES.indexOf(lb);
    if (i < 0) return;
    scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated });
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollToLb(safe, false);
    });
    return () => cancelAnimationFrame(id);
  }, [safe, scrollToLb]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const raw = Math.round(y / ITEM_HEIGHT);
      const i = Math.max(0, Math.min(VALUES.length - 1, raw));
      const lb = VALUES[i]!;
      if (lb !== value) onChange(lb);
    },
    [onChange, value]
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.window} pointerEvents="box-none">
        <View pointerEvents="none" style={styles.highlight} />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          style={styles.list}
          onMomentumScrollEnd={onMomentumScrollEnd}>
          {VALUES.map((item) => {
            const active = item === safe;
            return (
              <View key={item} style={styles.row}>
                <Text style={[styles.rowText, active && styles.rowTextActive]}>{item} lb</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  hint: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 12,
    lineHeight: 18,
  },
  window: {
    height: PICKER_HEIGHT,
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PAD,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    backgroundColor: 'rgba(120,120,128,0.24)',
    zIndex: 1,
  },
  list: {
    flexGrow: 0,
    height: PICKER_HEIGHT,
  },
  listContent: {
    paddingVertical: PAD,
  },
  row: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    fontFamily: theme.fonts.body,
    fontSize: 20,
    color: 'rgba(235,235,245,0.38)',
  },
  rowTextActive: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 22,
    color: theme.colors.onBackground,
  },
});
