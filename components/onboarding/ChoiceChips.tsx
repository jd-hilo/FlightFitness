import { Pressable, Text, View } from 'react-native';

import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';

type Option = { id: string; label: string };

export function ChoiceChips({
  options,
  isSelected,
  onPress,
  isDisabled,
}: {
  options: readonly Option[];
  isSelected: (id: string) => boolean;
  onPress: (id: string) => void;
  isDisabled?: (id: string) => boolean;
}) {
  return (
    <View style={styles.chipGrid}>
      {options.map((opt) => {
        const selected = isSelected(opt.id);
        const disabled = isDisabled?.(opt.id) ?? false;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onPress(opt.id)}
            style={[styles.chip, selected && styles.chipSelected, disabled && { opacity: 0.35 }]}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
