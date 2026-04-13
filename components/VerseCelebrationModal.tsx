import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/constants/theme';
import type { VerseEntry } from '@/lib/verses';

type Props = {
  visible: boolean;
  verse: VerseEntry | null;
  reflection?: string;
  onClose: () => void;
};

export function VerseCelebrationModal({
  visible,
  verse,
  reflection,
  onClose,
}: Props) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 18 });
    } else {
      opacity.value = 0;
      scale.value = 0.9;
    }
  }, [visible, opacity, scale]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!verse) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, cardStyle]}>
          <MaterialIcons
            name="auto-awesome"
            size={40}
            color={theme.colors.gold}
            style={styles.icon}
          />
          <Text style={styles.label}>Well done</Text>
          <Text style={styles.body}>&ldquo;{verse.text}&rdquo;</Text>
          <Text style={styles.ref}>— {verse.reference}</Text>
          {reflection ? (
            <Text style={styles.reflect}>{reflection}</Text>
          ) : null}
          <Pressable style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Continue</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 28,
  },
  icon: { alignSelf: 'center', marginBottom: 12 },
  label: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 17,
    lineHeight: 26,
    color: theme.colors.onBackground,
    textAlign: 'center',
  },
  ref: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  reflect: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  btn: {
    marginTop: 24,
    backgroundColor: theme.colors.gold,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
  },
});
