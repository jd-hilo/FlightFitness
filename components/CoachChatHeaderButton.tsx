import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Href } from 'expo-router';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';
import { supabaseConfigured } from '@/lib/supabase';
import { useCoachChatStore } from '@/stores/coachChatStore';

export function CoachChatHeaderButton() {
  const unreadCount = useCoachChatStore((s) => s.unreadCount);
  const hasUnread = unreadCount > 0;

  if (!supabaseConfigured) return null;

  return (
    <Pressable
      onPress={() => router.push('/coach-chat' as Href)}
      hitSlop={8}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={
        hasUnread
          ? `Open coach messages, ${unreadCount} unread`
          : 'Open coach messages'
      }>
      <MaterialIcons name="chat" size={24} color={theme.colors.gold} />
      {hasUnread ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    padding: 4,
  },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
    borderWidth: 1,
    borderColor: theme.colors.background,
  },
});
