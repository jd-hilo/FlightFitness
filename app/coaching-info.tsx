import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { CoachingWaitlistJoinedModal } from '@/components/CoachingWaitlistJoinedModal';
import { theme } from '@/constants/theme';
import { acceptCoachInvite } from '@/lib/api/coachInvite';
import {
  isCurrentUserOnCoachingWaitlist,
  submitCoachingWaitlistFromSession,
} from '@/lib/api/coachingWaitlist';
import {
  COACHING_DESCRIPTION,
  COACHING_INFO_HIGHLIGHTS,
  COACHING_WAITLIST_HINT,
} from '@/lib/coachingPlanCopy';
import {
  type SubscriptionTier,
  useSubscriptionStore,
} from '@/stores/subscriptionStore';

export default function CoachingInfoScreen() {
  const insets = useSafeAreaInsets();
  const tier = useSubscriptionStore((s) => s.tier);
  const setTier = useSubscriptionStore((s) => s.setTier);
  const coachingActive = tier === 'coaching';
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);

  const loadWaitlist = useCallback(() => {
    void (async () => {
      const on = await isCurrentUserOnCoachingWaitlist();
      setWaitlistJoined(on);
    })();
  }, []);

  useEffect(() => {
    loadWaitlist();
  }, [loadWaitlist]);

  const onJoinWaitlist = useCallback(async () => {
    if (waitlistJoined || coachingActive) return;
    setWaitlistBusy(true);
    const res = await submitCoachingWaitlistFromSession();
    setWaitlistBusy(false);
    if (!res.ok) {
      Alert.alert('Could not join waitlist', res.error);
      return;
    }
    setWaitlistJoined(true);
    setModalOpen(true);
  }, [waitlistJoined, coachingActive]);

  const onPrimary = () => {
    if (coachingActive) {
      router.push('/coach-chat');
      return;
    }
    void onJoinWaitlist();
  };

  const onAcceptInvite = useCallback(async () => {
    setInviteBusy(true);
    const res = await acceptCoachInvite(inviteCode);
    setInviteBusy(false);
    if (!res.ok) {
      Alert.alert('Could not join', res.error);
      return;
    }
    if (
      res.subscriptionTier === 'free' ||
      res.subscriptionTier === 'essentials' ||
      res.subscriptionTier === 'coaching'
    ) {
      setTier(res.subscriptionTier as SubscriptionTier);
    }
    Alert.alert(
      'You\'re connected',
      res.coachDisplayName
        ? `You're on ${res.coachDisplayName}'s roster. Open chat anytime.`
        : 'Your coach can now push plans and messages to you.',
      [{ text: 'Message coach', onPress: () => router.push('/coach-chat') }]
    );
  }, [inviteCode, setTier]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'rgba(255,215,0,0.10)', 'transparent']}
        locations={[0, 0.45, 1]}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.gold} />
        </Pressable>
        <Text style={styles.headerTitle}>Custom Coaching</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>Next level</Text>
        <Text style={styles.headline}>A coach in your corner</Text>
        <Text style={styles.lead}>{COACHING_DESCRIPTION}</Text>

        <View style={styles.list}>
          {COACHING_INFO_HIGHLIGHTS.map((item) => (
            <View key={item.title} style={styles.card}>
              <View style={styles.iconWrap}>
                <MaterialIcons name={item.icon} size={22} color={theme.colors.gold} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.hint}>{COACHING_WAITLIST_HINT}</Text>

        <View style={styles.inviteBox}>
          <Text style={styles.inviteLabel}>Have a coach invite code?</Text>
          <TextInput
            style={styles.inviteInput}
            value={inviteCode}
            onChangeText={(t) => setInviteCode(t.toUpperCase())}
            placeholder="e.g. AB12CD34"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            blurOnSubmit
            maxLength={12}
          />
          <Pressable
            style={[styles.inviteBtn, inviteBusy && styles.ctaMuted]}
            onPress={() => void onAcceptInvite()}
            disabled={inviteBusy || !inviteCode.trim()}>
            {inviteBusy ? (
              <AppLoadingCross size="small" />
            ) : (
              <Text style={styles.inviteBtnTxt}>Join my coach</Text>
            )}
          </Pressable>
        </View>

        <Pressable
          style={[styles.cta, (waitlistBusy || waitlistJoined) && !coachingActive && styles.ctaMuted]}
          onPress={onPrimary}
          disabled={waitlistBusy || (waitlistJoined && !coachingActive)}>
          {waitlistBusy ? (
            <AppLoadingCross size="small" />
          ) : (
            <Text style={styles.ctaTxt}>
              {coachingActive
                ? 'Message your coach'
                : waitlistJoined
                  ? 'Waitlist joined'
                  : 'Join waitlist'}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <CoachingWaitlistJoinedModal
        visible={modalOpen}
        onDismiss={() => setModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050505',
    overflow: 'hidden',
  },
  topGlow: {
    position: 'absolute',
    left: -60,
    right: -60,
    top: 0,
    height: 320,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontFamily: theme.fonts.headline,
    fontSize: 16,
    color: theme.colors.onBackground,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2.4,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  headline: {
    fontFamily: theme.fonts.headline,
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 30,
    marginBottom: 10,
  },
  lead: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.58)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  list: {
    gap: 10,
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.22)',
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 14,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    lineHeight: 18,
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.58)',
    lineHeight: 18,
  },
  hint: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.48)',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  inviteBox: {
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.28)',
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  inviteLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  inviteInput: {
    fontFamily: theme.fonts.headline,
    fontSize: 18,
    letterSpacing: 3,
    color: '#FFFFFF',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  inviteBtn: {
    borderWidth: 1,
    borderColor: theme.colors.gold,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  inviteBtnTxt: {
    fontFamily: theme.fonts.headline,
    fontSize: 14,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  cta: {
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  ctaMuted: {
    opacity: 0.72,
  },
  ctaTxt: {
    fontFamily: theme.fonts.headline,
    fontSize: 17,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
});
