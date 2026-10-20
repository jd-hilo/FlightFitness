import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { frostedTile, pageTitleStyle } from '@/components/FrostedCard';
import { ProfileUpgradeBanner } from '@/components/profile/ProfileUpgradeBanner';
import { RestTimerSoundPicker } from '@/components/profile/RestTimerSoundPicker';
import { RestVerseModePicker } from '@/components/profile/RestVerseModePicker';
import { theme } from '@/constants/theme';
import { deleteAccount } from '@/lib/api/deleteAccount';
import { generateWeekPlan } from '@/lib/api/plan';
import { paywallHref, trackPlanGenerated } from '@/lib/analytics';
import { isAiWeekPlanEnabled } from '@/lib/featureFlags';
import {
  FEEDBACK_MAILTO,
  FLIGHT_FITNESS_PRIVACY_POLICY_URL,
  FLIGHT_FITNESS_TERMS_OF_SERVICE_URL,
  REPDB_URL,
} from '@/lib/legalUrls';
import { presentRevenueCatCustomerCenter } from '@/lib/revenueCat';
import { resetLocalAppStateForSignOut } from '@/lib/signOutReset';
import { supabase } from '@/lib/supabase';
import { viewWeekStartYmdLocal } from '@/lib/weekUtils';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [regeneratingPlan, setRegeneratingPlan] = useState(false);

  const tier = useSubscriptionStore((s) => s.tier);
  const firstName = useOnboardingStore((s) => s.answers.firstName.trim());
  const answers = useOnboardingStore((s) => s.answers);
  const setFromWeekPlan = usePlanStore((s) => s.setFromWeekPlan);

  const onSignOut = () => {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            resetLocalAppStateForSignOut();
            if (supabase) {
              await supabase.auth.signOut({ scope: 'local' });
            }
          } finally {
            setSigningOut(false);
            router.replace('/welcome' as Href);
          }
        },
      },
    ]);
  };

  const onDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and cloud data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeletingAccount(true);
              const res = await deleteAccount();
              setDeletingAccount(false);
              if (!res.ok) {
                Alert.alert('Could not delete account', res.error);
                return;
              }
              resetLocalAppStateForSignOut();
              if (supabase) await supabase.auth.signOut({ scope: 'local' });
              router.replace('/welcome' as Href);
            })();
          },
        },
      ]
    );
  }, []);

  const onManagePlan = useCallback(() => {
    if (tier === 'free') {
      router.push(paywallHref('elite'));
      return;
    }
    void (async () => {
      setManagingSubscription(true);
      try {
        await presentRevenueCatCustomerCenter();
      } catch (error) {
        Alert.alert(
          'Subscriptions',
          error instanceof Error ? error.message : 'Try again shortly.'
        );
      } finally {
        setManagingSubscription(false);
      }
    })();
  }, [tier]);

  const onSubmitFeedback = useCallback(() => {
    void Linking.openURL(FEEDBACK_MAILTO).catch(() => {
      Alert.alert('Email', 'Could not open mail. Write us at hello@hilo.media');
    });
  }, []);

  const onDevRegeneratePlan = useCallback(() => {
    Alert.alert('Regenerate week?', 'Dev only — replaces this week\'s plan.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate',
        onPress: () => {
          void (async () => {
            setRegeneratingPlan(true);
            const started = Date.now();
            const res = await generateWeekPlan({
              onboarding: answers,
              action: 'full',
              weekStartHint: viewWeekStartYmdLocal(),
            });
            trackPlanGenerated({
              source: 'regenerate',
              success: res.ok,
              durationMs: Date.now() - started,
              wasMock: res.ok ? Boolean(res.wasMock) : false,
            });
            setRegeneratingPlan(false);
            if (!res.ok) {
              Alert.alert('Failed', res.error);
              return;
            }
            setFromWeekPlan(res.plan);
          })();
        },
      },
    ]);
  }, [answers, setFromWeekPlan]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back">
            <MaterialIcons name="arrow-back" size={22} color={theme.colors.onBackground} />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.profileRow, pressed && styles.pressed]}
          onPress={() => router.push('/profile-edit' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Edit profile">
          <View style={styles.avatar}>
            <MaterialIcons name="person-outline" size={24} color={theme.colors.champagne} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{firstName || 'Your profile'}</Text>
            <Text style={styles.rowSub}>Edit profile and goals</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
        </Pressable>

        {__DEV__ && isAiWeekPlanEnabled() ? (
          <Pressable
            style={styles.devBtn}
            onPress={onDevRegeneratePlan}
            disabled={regeneratingPlan}>
            <Text style={styles.devBtnTxt}>
              {regeneratingPlan ? 'Regenerating…' : 'Dev: regenerate week'}
            </Text>
          </Pressable>
        ) : null}

        <RestTimerSoundPicker />
        <RestVerseModePicker />

        <ProfileUpgradeBanner
          tier={tier}
          onUpgrade={() => router.push(paywallHref('elite'))}
          onCoaching={() => router.push('/coaching-info')}
        />
        {tier !== 'free' ? (
          <Pressable
            style={styles.manageLink}
            onPress={onManagePlan}
            disabled={managingSubscription}
            hitSlop={8}>
            <Text style={styles.manageLinkTxt}>
              {managingSubscription ? 'Opening subscriptions…' : 'Manage subscription'}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.group}>
          <Pressable
            style={styles.groupRow}
            onPress={onSubmitFeedback}
            accessibilityRole="button"
            accessibilityLabel="Submit app feedback">
            <MaterialIcons name="mail-outline" size={20} color={theme.colors.champagne} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Have feedback?</Text>
              <Text style={styles.rowSub}>Submit app feedback</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.groupRow}
            onPress={() => void WebBrowser.openBrowserAsync(FLIGHT_FITNESS_TERMS_OF_SERVICE_URL)}
            accessibilityRole="link"
            accessibilityLabel="Terms of Service">
            <MaterialIcons name="description" size={20} color={theme.colors.champagne} />
            <Text style={[styles.rowTitle, styles.rowText]}>Terms of Service</Text>
            <MaterialIcons name="open-in-new" size={18} color={theme.colors.onSurfaceVariant} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.groupRow}
            onPress={() => void WebBrowser.openBrowserAsync(FLIGHT_FITNESS_PRIVACY_POLICY_URL)}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy">
            <MaterialIcons name="privacy-tip" size={20} color={theme.colors.champagne} />
            <Text style={[styles.rowTitle, styles.rowText]}>Privacy Policy</Text>
            <MaterialIcons name="open-in-new" size={18} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <Pressable
          style={styles.signOutBtn}
          onPress={onSignOut}
          disabled={signingOut || deletingAccount}>
          <Text style={styles.signOutTxt}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
        </Pressable>

        <Pressable
          onPress={onDeleteAccount}
          disabled={signingOut || deletingAccount}
          hitSlop={8}>
          <Text style={styles.deleteTxt}>
            {deletingAccount ? 'Deleting…' : 'Delete account'}
          </Text>
        </Pressable>

        <Text style={styles.attribution}>
          Exercise data by{' '}
          <Text
            style={styles.attributionLink}
            onPress={() => void WebBrowser.openBrowserAsync(REPDB_URL)}>
            RepDB (repdb.co)
          </Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 22 },
  pressed: { opacity: 0.85 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
  },
  title: pageTitleStyle,
  profileRow: {
    ...frostedTile,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.champagneSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: theme.fonts.label,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  rowSub: {
    marginTop: 3,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  group: {
    ...frostedTile,
    marginTop: 4,
    marginBottom: 20,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.outline,
    marginLeft: 50,
  },
  manageLink: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 16,
  },
  manageLinkTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
  devBtn: {
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: theme.radii.full,
  },
  devBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: theme.radii.full,
  },
  signOutTxt: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 15,
    color: theme.colors.error,
  },
  deleteTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
  },
  attribution: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  attributionLink: {
    color: theme.colors.champagne,
    textDecorationLine: 'underline',
  },
});
