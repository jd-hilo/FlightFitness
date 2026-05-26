import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type KeyboardTypeOptions,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  compact?: boolean;
  allowKeyboardInput?: boolean;
  keyboardType?: KeyboardTypeOptions;
};

function formatValue(value: number, suffix?: string) {
  const num = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return suffix ? `${num} ${suffix}` : num;
}

export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  compact = false,
  allowKeyboardInput = false,
  keyboardType = 'decimal-pad',
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const btnSize = compact ? 40 : 44;

  const dec = () => onChange(Math.max(min, Math.round((value - step) * 10) / 10));
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 10) / 10));

  const commitDraft = () => {
    const parsed = parseFloat(draft.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed)) {
      const clamped = Math.max(min, Math.min(max, Math.round(parsed * 10) / 10));
      onChange(clamped);
    }
    setEditing(false);
  };

  const startEditing = () => {
    if (!allowKeyboardInput) return;
    setDraft(Number.isInteger(value) ? String(value) : value.toFixed(1));
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.row, compact && styles.rowCompact]}>
        <Pressable
          onPress={dec}
          style={[styles.btn, { width: btnSize, height: btnSize }]}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label ?? 'value'}`}>
          <MaterialIcons
            name="remove"
            size={compact ? 18 : 20}
            color={theme.colors.gold}
          />
        </Pressable>
        <View style={styles.valueWrap}>
          {editing ? (
            <TextInput
              ref={inputRef}
              style={[styles.valueInput, compact && styles.valueInputCompact]}
              value={draft}
              onChangeText={setDraft}
              onBlur={commitDraft}
              onSubmitEditing={commitDraft}
              keyboardType={keyboardType}
              selectTextOnFocus
              returnKeyType="done"
              placeholder="0"
              placeholderTextColor={theme.colors.onSurfaceVariant}
            />
          ) : (
            <Pressable
              style={styles.valuePressable}
              onPress={startEditing}
              disabled={!allowKeyboardInput}
              accessibilityRole={allowKeyboardInput ? 'button' : undefined}
              accessibilityLabel={
                allowKeyboardInput ? `Edit ${label ?? 'value'}` : undefined
              }>
              <Text style={[styles.value, compact && styles.valueCompact]}>
                {formatValue(value, suffix)}
              </Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={inc}
          style={[styles.btn, styles.btnRight, { width: btnSize, height: btnSize }]}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label ?? 'value'}`}>
          <MaterialIcons
            name="add"
            size={compact ? 18 : 20}
            color={theme.colors.gold}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerHigh,
    overflow: 'hidden',
    minHeight: 44,
  },
  rowCompact: { minHeight: 40 },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceContainer,
    borderRightWidth: 1,
    borderRightColor: theme.colors.outline,
  },
  btnRight: {
    borderRightWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.outline,
  },
  valueWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minHeight: 40,
  },
  valuePressable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  value: {
    fontFamily: theme.fonts.headline,
    fontSize: 18,
    color: theme.colors.onBackground,
    textAlign: 'center',
  },
  valueCompact: { fontSize: 16 },
  valueInput: {
    width: '100%',
    fontFamily: theme.fonts.headline,
    fontSize: 18,
    color: theme.colors.onBackground,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  valueInputCompact: { fontSize: 16, paddingVertical: 6 },
});
