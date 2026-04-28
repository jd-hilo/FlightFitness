import { useCallback, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { theme } from '@/constants/theme';
import { submitCoachingWaitlist } from '@/lib/api/coachingWaitlist';
import {
  COACHING_DESCRIPTION,
  COACHING_FEATURES,
  COACHING_WAITLIST_HINT,
} from '@/lib/coachingPlanCopy';

const HEADER_LOGO = require('../assets/images/header-logo.png');

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /** Called after a successful join (or duplicate email treated as success). */
  onJoined: (info?: { alreadyListed?: boolean }) => void;
};

export function CoachingWaitlistModal({ visible, onDismiss, onJoined }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setEmail('');
    setError(null);
    setBusy(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onDismiss();
  }, [onDismiss, reset]);

  const handleSubmit = useCallback(async () => {
    setBusy(true);
    setError(null);
    const res = await submitCoachingWaitlist(email);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    reset();
    onJoined({ alreadyListed: Boolean(res.alreadyListed) });
  }, [email, onJoined, reset]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.touchOut} onPress={handleClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.titleRow}>
            <Image
              source={HEADER_LOGO}
              style={[styles.titleLogo, Platform.OS === 'ios' ? { tintColor: '#FFFFFF' } : null]}
              resizeMode="contain"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.title}>Join FF Custom Coaching</Text>
          </View>
          <Text style={styles.titleHint}>We&apos;ll email you when a seat opens.</Text>
          <Text style={styles.body}>
            {COACHING_DESCRIPTION} {COACHING_WAITLIST_HINT}
          </Text>
          <View style={styles.bullets}>
            {COACHING_FEATURES.map((feature) => (
              <Text
                key={feature.label}
                style={styles.bulletLine}
                numberOfLines={2}>
                • {feature.label}
              </Text>
            ))}
          </View>
          <Text style={styles.label}>Your email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="email-address"
            returnKeyType="done"
            blurOnSubmit
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={[styles.primary, busy && styles.primaryDisabled]}
            onPress={() => void handleSubmit()}
            disabled={busy}>
            {busy ? (
              <AppLoadingCross size="small" />
            ) : (
              <Text style={styles.primaryTxt}>Join waitlist</Text>
            )}
          </Pressable>
          <Pressable onPress={handleClose} style={styles.cancelWrap} disabled={busy}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  touchOut: { flex: 1 },
  sheet: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderTopWidth: 1,
    borderColor: theme.colors.outline,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  titleLogo: {
    width: 36,
    height: 36,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    lineHeight: 24,
  },
  titleHint: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 12,
  },
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 14,
  },
  bullets: { marginBottom: 18, gap: 6 },
  bulletLine: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onBackground,
    lineHeight: 19,
  },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.onBackground,
    marginBottom: 12,
  },
  error: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.error,
    marginBottom: 10,
  },
  primary: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryDisabled: { opacity: 0.6 },
  primaryTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.onGold,
    textTransform: 'uppercase',
  },
  cancelWrap: { alignItems: 'center', paddingVertical: 8 },
  cancel: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
  },
});
