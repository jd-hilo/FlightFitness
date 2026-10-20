import { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  value: number;
  onCommit: (value: number) => void;
  decimal?: boolean;
  min?: number;
  max?: number;
  accessibilityLabel: string;
  done?: boolean;
};

function display(n: number) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

/** Boxed numeric field for set weight / reps; keeps a text draft so "52." can be typed. */
export function SetValueInput({
  value,
  onCommit,
  decimal = false,
  min = 0,
  max = 999,
  accessibilityLabel,
  done = false,
}: Props) {
  const [draft, setDraft] = useState(display(value));

  useEffect(() => {
    setDraft(display(value));
  }, [value]);

  const commit = () => {
    const parsed = decimal ? parseFloat(draft) : parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(display(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    setDraft(display(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <TextInput
      style={[styles.box, done && styles.boxDone]}
      value={draft}
      onChangeText={setDraft}
      onEndEditing={commit}
      onBlur={commit}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      returnKeyType="done"
      selectTextOnFocus
      maxLength={5}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    width: 64,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    textAlign: 'center',
    fontFamily: theme.fonts.label,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  boxDone: {
    color: 'rgba(255,255,255,0.75)',
  },
});
