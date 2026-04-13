import { useCallback, useEffect, useRef } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';
import { weightLbValues } from '@/lib/onboardingOptions';

const VALUES = weightLbValues();
const ITEM_HEIGHT = 48;
const PICKER_HEIGHT = 216;
const PAD = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

type Props = {
  label: string;
  hint?: string;
  value: number;
  onChange: (lb: number) => void;
};

export function WeightPicker({ label, hint, value, onChange }: Props) {
  const listRef = useRef<FlatList<number>>(null);
  const safe =
    value >= VALUES[0]! && value <= VALUES[VALUES.length - 1]!
      ? value
      : VALUES[0]!;

  const scrollToLb = useCallback((lb: number, animated: boolean) => {
    const i = VALUES.indexOf(lb);
    if (i < 0) return;
    listRef.current?.scrollToOffset({
      offset: i * ITEM_HEIGHT,
      animated,
    });
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

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<number>) => {
      const active = item === safe;
      return (
        <View style={styles.row}>
          <Text style={[styles.rowText, active && styles.rowTextActive]}>
            {item} lb
          </Text>
        </View>
      );
    },
    [safe]
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.pickerShell}>
        <View style={styles.window} pointerEvents="box-none">
          <View pointerEvents="none" style={styles.highlight} />
          <FlatList
            ref={listRef}
            data={VALUES}
            keyExtractor={(lb) => String(lb)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            removeClippedSubviews={Platform.OS !== 'web'}
            getItemLayout={(_, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
            contentContainerStyle={styles.listContent}
            style={styles.list}
            onMomentumScrollEnd={onMomentumScrollEnd}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  hint: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 12,
    lineHeight: 18,
  },
  pickerShell: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    overflow: 'hidden',
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
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.gold,
    zIndex: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
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
    fontSize: 18,
    color: theme.colors.onSurfaceVariant,
  },
  rowTextActive: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 20,
    color: theme.colors.onBackground,
  },
});
