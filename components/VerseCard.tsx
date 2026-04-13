import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { VerseEntry } from '@/lib/verses';

type Props = {
  verse: VerseEntry;
  subtitle?: string;
  /** Inside a parent task card — no outer margin / subtler fill */
  embedded?: boolean;
};

export function VerseCard({
  verse,
  subtitle = "Today's word",
  embedded,
}: Props) {
  return (
    <View style={[styles.card, embedded && styles.cardEmbedded]}>
      <Text style={styles.kicker}>{subtitle}</Text>
      <Text style={styles.text}>&ldquo;{verse.text}&rdquo;</Text>
      <Text style={styles.ref}>— {verse.reference}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 20,
    marginBottom: 20,
  },
  cardEmbedded: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  text: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.onBackground,
    marginBottom: 12,
  },
  ref: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
});
