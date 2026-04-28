import { LinearGradient } from 'expo-linear-gradient';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

/**
 * Post–waitlist-join confirmation. Visual language matches the dark paywall / upgrade sheet.
 */
export function CoachingWaitlistJoinedModal({ visible, onDismiss }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <View style={styles.backdrop} accessibilityViewIsModal>
        <Pressable style={styles.touchOut} onPress={onDismiss} />
        <View
          style={[
            styles.sheet,
            {
              marginBottom: insets.bottom + 16,
              paddingBottom: 28,
            },
          ]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,215,0,0.08)', 'transparent']}
            locations={[0, 0.35, 1]}
            style={styles.sheetGlow}
            pointerEvents="none"
          />
          <Text style={styles.kicker}>Flight Fitness</Text>
          <Text style={styles.title}>You&apos;re on the waitlist</Text>
          <Text style={styles.body}>
            Our coaching program is currently at capacity. We&apos;ll let you know as soon as
            a seat opens up.
          </Text>
          <Pressable style={styles.primary} onPress={onDismiss} accessibilityRole="button">
            <Text style={styles.primaryTxt}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
  },
  touchOut: { flex: 1 },
  sheet: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 26,
    paddingTop: 32,
    overflow: 'hidden',
  },
  sheetGlow: {
    position: 'absolute',
    left: -40,
    right: -40,
    top: 0,
    height: 160,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 3,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  title: {
    fontFamily: theme.fonts.headline,
    fontSize: 24,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    lineHeight: 28,
    marginBottom: 14,
  },
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.62)',
    lineHeight: 22,
    marginBottom: 28,
  },
  primary: {
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryTxt: {
    fontFamily: theme.fonts.headline,
    fontSize: 16,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
});
