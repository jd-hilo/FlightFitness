import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  /** Load a local sample week and leave this screen (AI may still finish in background). */
  onUseSampleWeek?: () => void;
};

export function PlanGeneratingModal({ visible, onUseSampleWeek }: Props) {
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
            We are creating your personalized meals, workouts, and grocery list from your
            answers. Most finish within a minute.
          </Text>
          <Text style={styles.sampleHint}>
            While you wait, you can open the app with a sample week and regenerate your
            personalized week anytime from Fuel or Train.
          </Text>
          <View style={styles.spinner}>
            <AppLoadingCross size="large" />
          </View>
          {onUseSampleWeek ? (
            <Pressable
              onPress={onUseSampleWeek}
              style={styles.sampleBtn}
              accessibilityRole="button"
              accessibilityLabel="Continue with sample week">
              <Text style={styles.sampleBtnTxt}>Continue with sample week</Text>
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
    marginBottom: 12,
  },
  sampleHint: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 24,
    opacity: 0.92,
  },
  spinner: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleBtn: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: theme.colors.gold,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  sampleBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
});
