import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import type { Href } from 'expo-router';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import {
  fetchCoachMessages,
  getCoachChatUserId,
  sendUserMessage,
  subscribeCoachMessages,
  type CoachMessageRow,
} from '@/lib/api/coachChat';
import { supabaseConfigured } from '@/lib/supabase';
import { useCoachChatStore } from '@/stores/coachChatStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export default function CoachChatScreen() {
  const insets = useSafeAreaInsets();
  const tier = useSubscriptionStore((s) => s.tier);
  const markThreadReadAndRefresh = useCoachChatStore((s) => s.markThreadReadAndRefresh);

  const [messages, setMessages] = useState<CoachMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<CoachMessageRow>>(null);

  const coaching = tier === 'coaching';

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchCoachMessages();
      setMessages(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!coaching) return;
    void load();
  }, [coaching, load]);

  useEffect(() => {
    if (!coaching || !supabaseConfigured) return;
    let cancelled = false;
    let unsub: (() => void) | null = null;
    void (async () => {
      const uid = await getCoachChatUserId();
      if (cancelled || !uid) return;
      unsub = subscribeCoachMessages(
        uid,
        () => {
          void load();
        },
        'list'
      );
      if (cancelled) {
        unsub();
        unsub = null;
      }
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [coaching, load]);

  useFocusEffect(
    useCallback(() => {
      if (!coaching) return;
      void markThreadReadAndRefresh();
    }, [coaching, markThreadReadAndRefresh])
  );

  useEffect(() => {
    if (coaching) return;
    router.replace('/paywall' as Href);
  }, [coaching]);

  const onSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const r = await sendUserMessage(input);
      if (r.ok) {
        setInput('');
        await load();
        listRef.current?.scrollToEnd({ animated: true });
      } else {
        Alert.alert('Could not send', r.error);
      }
    } finally {
      setSending(false);
    }
  };

  const emptyHint = useMemo(() => {
    if (!supabaseConfigured) return 'Connect the app to Supabase to message your coach.';
    return 'Say hi to Jude — replies appear here when your coach responds.';
  }, []);

  if (!coaching) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.gold} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 52 : 0}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.gold} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 8 },
            messages.length === 0 && styles.listEmpty,
          ]}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <Text style={styles.empty}>{emptyHint}</Text>
          }
          renderItem={({ item }) => (
            <MessageBubble message={item} />
          )}
        />
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={4000}
          editable={!sending && supabaseConfigured}
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => void onSend()}
          disabled={!input.trim() || sending || !supabaseConfigured}
          accessibilityRole="button"
          accessibilityLabel="Send message">
          {sending ? (
            <ActivityIndicator size="small" color={theme.colors.onGold} />
          ) : (
            <MaterialIcons name="send" size={22} color={theme.colors.onGold} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: CoachMessageRow }) {
  const mine = message.sender === 'user';
  return (
    <View
      style={[styles.bubbleRow, mine ? styles.bubbleRowUser : styles.bubbleRowCoach]}>
      {!mine ? (
        <Text style={styles.coachLabel}>Jude</Text>
      ) : null}
      <View style={[styles.bubble, mine ? styles.bubbleUser : styles.bubbleCoach]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextUser]}>
          {message.body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexGrow: 1,
  },
  listEmpty: {
    justifyContent: 'center',
  },
  empty: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  bubbleRow: {
    marginBottom: 14,
    maxWidth: '100%',
  },
  bubbleRowUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleRowCoach: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  coachLabel: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 11,
    color: theme.colors.goldDim,
    marginBottom: 4,
    marginLeft: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: theme.colors.gold,
  },
  bubbleCoach: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  bubbleText: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.onBackground,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: theme.colors.onGold,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.onBackground,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});
