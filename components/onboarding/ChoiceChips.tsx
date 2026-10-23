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
  const last = options.length - 1;
  return (
    <View style={styles.choiceList}>
      {options.map((opt, i) => {
        const selected = isSelected(opt.id);
        const disabled = isDisabled?.(opt.id) ?? false;
        return (
          <View key={opt.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => {
                hapticSelection();
                onPress(opt.id);
              }}
              style={({ pressed }) => [
                styles.choiceRow,
                i === 0 && styles.choiceRowFirst,
                i === last && styles.choiceRowLast,
                selected && styles.choiceRowSelected,
                disabled && styles.choiceRowDisabled,
                pressed && !disabled && styles.choiceRowPressed,
              ]}>
              <Text
                style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}
                numberOfLines={2}>
                {opt.label}
              </Text>
              {selected ? (
                <MaterialIcons name="check" size={22} color={theme.colors.champagne} />
              ) : (
                <View style={styles.choiceCheckEmpty} />
              )}
            </Pressable>
            {i < last ? <View style={styles.choiceSep} /> : null}
          </View>
        );
      })}
    </View>
  );
}
