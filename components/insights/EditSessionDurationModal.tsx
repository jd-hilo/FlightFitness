import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NumberStepper } from '@/components/plan/NumberStepper';
import { theme } from '@/constants/theme';
import { formatDuration } from '@/lib/formatDuration';
import { formatRelativeDate } from '@/lib/insights/workoutInsights';
import type { WorkoutSessionLogEntry } from '@/stores/workoutSessionLogStore';

type Props = {
  visible: boolean;
  session: WorkoutSessionLogEntry | null;
  onClose: () => void;
  onSave: (sessionId: string, durationSec: number) => void;
};

export function EditSessionDurationModal({
  visible,
  session,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!session || !visible) return;
    const total = Math.max(0, Math.floor(session.durationSec));
    setMinutes(Math.floor(total / 60));
    setSeconds(total % 60);
  }, [session, visible]);

  if (!session) return null;

  const previewSec = minutes * 60 + seconds;

  const handleSave = () => {
    onSave(session.id, previewSec);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={14} style={styles.headerHit}>
            <Text style={styles.headerBtn}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Edit duration</Text>
          <Pressable onPress={handleSave} hitSlop={14} style={styles.headerHit}>
            <Text style={styles.headerBtnPrimary}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingBottom: Math.max(insets.bottom, 24) + 48 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.intro}>
            {session.title ? (
              <Text style={styles.sessionTitle}>{session.title}</Text>
            ) : null}
            <Text style={styles.sessionMeta}>
              {formatRelativeDate(session.dateKey)}
            </Text>
            <Text style={styles.sessionCurrent}>
              Currently{' '}
              {session.durationSec > 0
                ? formatDuration(session.durationSec)
                : 'not set'}
            </Text>
          </View>

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>New duration</Text>
            <Text style={styles.previewValue}>{formatDuration(previewSec)}</Text>
          </View>

          <View style={styles.steppers}>
            <View style={styles.stepperCol}>
              <NumberStepper
                label="Minutes"
                value={minutes}
                onChange={setMinutes}
                min={0}
                max={600}
                step={1}
                allowKeyboardInput
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.stepperCol}>
              <NumberStepper
                label="Seconds"
                value={seconds}
                onChange={setSeconds}
                min={0}
                max={59}
                step={1}
                allowKeyboardInput
                keyboardType="number-pad"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  headerHit: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBtn: {
    fontFamily: theme.fonts.label,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
  },
  headerBtnPrimary: {
    fontFamily: theme.fonts.label,
    fontSize: 15,
    color: theme.colors.gold,
    textAlign: 'right',
  },
  headerTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 13,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  body: {
    paddingHorizontal: 28,
    paddingTop: 36,
  },
  intro: {
    marginBottom: 32,
  },
  sessionTitle: {
    fontFamily: theme.fonts.headline,
    fontSize: 24,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sessionMeta: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sessionCurrent: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.onSurfaceVariant,
  },
  preview: {
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 40,
    alignItems: 'center',
  },
  previewLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.5,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  previewValue: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 40,
    color: theme.colors.gold,
  },
  steppers: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepperCol: {
    flex: 1,
  },
});
