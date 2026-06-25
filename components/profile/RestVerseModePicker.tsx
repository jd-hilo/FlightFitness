import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { paywallHref } from '@/lib/analytics';
import { WORKOUT_VERSE_CYCLE_SIZE } from '@/lib/workoutVerseCycle';
import {
  useRestVerseModeStore,
  type RestVerseMode,
} from '@/stores/restVerseModeStore';
import { hasEssentialsAccess, useSubscriptionStore } from '@/stores/subscriptionStore';

const OPTIONS: { id: RestVerseMode; label: string; description: string }[] = [
  {
    id: 'cycle',
    label: 'Workout rotation',
    description: `Up to ${WORKOUT_VERSE_CYCLE_SIZE} different verses — one per rest`,
  },
  {
    id: 'daily',
    label: "Today's word",
    description: 'Same daily verse on every rest',
  },
];

export function RestVerseModePicker() {
  const mode = useRestVerseModeStore((s) => s.mode);
  const setMode = useRestVerseModeStore((s) => s.setMode);
  const tier = useSubscriptionStore((s) => s.tier);
  const canUseCycle = hasEssentialsAccess(tier);

  const onSelect = (id: RestVerseMode) => {
    if (id === 'cycle' && !canUseCycle) {
      router.push(paywallHref('rest_verses_gate'));
      return;
    }
    setMode(id);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>Rest timer scripture</Text>
      <Text style={styles.lead}>
        {canUseCycle
          ? 'Choose how verses appear between sets.'
          : 'Free includes today\u2019s word. Upgrade for a full rotation each workout.'}
      </Text>
      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const selected = mode === option.id;
          const locked = option.id === 'cycle' && !canUseCycle;
          return (
            <Pressable
              key={option.id}
              style={({ pressed }) => [
                styles.row,
                selected && !locked && styles.rowSelected,
                locked && styles.rowLocked,
                pressed && styles.rowPressed,
              ]}
              onPress={() => onSelect(option.id)}>
              <View style={styles.rowText}>
                <Text
                  style={[
                    styles.label,
                    selected && !locked && styles.labelSelected,
                    locked && styles.labelLocked,
                  ]}>
                  {option.label}
                </Text>
                <Text style={styles.desc}>
                  {locked ? 'Essentials · tap to upgrade' : option.description}
                </Text>
              </View>
              <MaterialIcons
                name={locked ? 'lock' : selected ? 'check-circle' : 'menu-book'}
                size={22}
                color={
                  locked
                    ? theme.colors.onSurfaceVariant
                    : selected
                      ? theme.colors.gold
                      : theme.colors.onSurfaceVariant
                }
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 16,
    marginBottom: 20,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  lead: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 14,
  },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    backgroundColor: theme.colors.surfaceContainerHigh,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowSelected: {
    borderColor: 'rgba(255, 215, 0, 0.55)',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  rowLocked: {
    opacity: 0.88,
  },
  rowPressed: { opacity: 0.9 },
  rowText: { flex: 1, minWidth: 0 },
  label: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  labelSelected: { color: theme.colors.gold },
  labelLocked: { color: theme.colors.onSurfaceVariant },
  desc: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 3,
    lineHeight: 16,
  },
});
