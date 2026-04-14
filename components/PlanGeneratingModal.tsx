import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  /** Optional — continues with a local sample week instead of waiting for AI. */
  onSkipSample?: () => void;
};

export function PlanGeneratingModal({ visible, onSkipSample }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}>
      <View style={styles.backdrop} accessibilityViewIsModal>
        <View style={styles.card}>
          <Text style={styles.kicker}>Flight Fitness</Text>
          <Text style={styles.title}>Building your week</Text>
          <Text style={styles.sub}>
            AI is creating meals, workouts, and your grocery list. This can take up to a
            minute.
          </Text>
          <ActivityIndicator
            size="large"
            color={theme.colors.gold}
            style={styles.spinner}
          />
          {onSkipSample ? (
            <Pressable
              onPress={onSkipSample}
              hitSlop={12}
              style={styles.skipHit}
              accessibilityRole="button"
              accessibilityLabel="Skip AI and use a sample plan">
              <Text style={styles.skipTxt}>Not now — use sample plan</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingVertical: 36,
    paddingHorizontal: 28,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 3,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  title: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 26,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
    marginBottom: 12,
    lineHeight: 30,
  },
  sub: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 32,
  },
  spinner: { marginBottom: 28 },
  skipHit: { alignSelf: 'center', paddingVertical: 8 },
  skipTxt: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
});
