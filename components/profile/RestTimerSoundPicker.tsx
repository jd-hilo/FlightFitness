import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { previewRestTimerSound } from '@/lib/restTimerDing';
import {
  REST_TIMER_SOUND_OPTIONS,
  type RestTimerSoundId,
} from '@/lib/restTimerSounds';
import { useRestTimerSoundStore } from '@/stores/restTimerSoundStore';

export function RestTimerSoundPicker() {
  const soundId = useRestTimerSoundStore((s) => s.soundId);
  const setSoundId = useRestTimerSoundStore((s) => s.setSoundId);

  const onSelect = (id: RestTimerSoundId) => {
    setSoundId(id);
    void previewRestTimerSound(id);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>Rest timer sound</Text>
      <Text style={styles.lead}>Tap to preview. Your pick plays when rest ends.</Text>
      <View style={styles.list}>
        {REST_TIMER_SOUND_OPTIONS.map((option) => {
          const selected = soundId === option.id;
          return (
            <Pressable
              key={option.id}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                pressed && styles.rowPressed,
              ]}
              onPress={() => onSelect(option.id)}>
              <View style={styles.rowText}>
                <Text style={[styles.label, selected && styles.labelSelected]}>
                  {option.label}
                </Text>
                <Text style={styles.desc}>{option.description}</Text>
              </View>
              <MaterialIcons
                name={selected ? 'check-circle' : 'volume-up'}
                size={22}
                color={selected ? theme.colors.gold : theme.colors.onSurfaceVariant}
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
  rowPressed: { opacity: 0.9 },
  rowText: { flex: 1, minWidth: 0 },
  label: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  labelSelected: { color: theme.colors.gold },
  desc: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 3,
    lineHeight: 16,
  },
});
