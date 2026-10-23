import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { theme } from '@/constants/theme';
import { hapticSelection } from '@/lib/haptics';

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
    <View style={styles.choiceList}>
      {options.map((opt) => {
        const selected = isSelected(opt.id);
        const disabled = isDisabled?.(opt.id) ?? false;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => {
              hapticSelection();
              onPress(opt.id);
            }}
            style={({ pressed }) => [
              styles.choiceRow,
              selected && styles.choiceRowSelected,
              disabled && styles.choiceRowDisabled,
              pressed && !disabled && styles.choiceRowPressed,
            ]}>
            <Text
              style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}
              numberOfLines={2}>
              {opt.label}
            </Text>
            <View style={[styles.choiceCheck, selected && styles.choiceCheckOn]}>
              {selected ? (
                <MaterialIcons name="check" size={16} color={theme.colors.onChampagne} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
