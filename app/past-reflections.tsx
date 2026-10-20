import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { frostedTile } from '@/components/FrostedCard';
import { SunriseBackdrop } from '@/components/SunriseBackdrop';
import { theme } from '@/constants/theme';
import { getDailyFaithReading } from '@/lib/faithReadings';
import { parseYmdLocal } from '@/lib/weekUtils';
import { useFaithDailyStore } from '@/stores/faithDailyStore';

type PastReflection = {
  dateKey: string;
  text: string;
  done: boolean;
  reference: string;
  title: string;
  passage: string;
};

/** Reconstruct the rotating study for a stored day key (matches the live Faith tab). */
function readingForDateKey(dateKey: string) {
  return getDailyFaithReading(new Date(`${dateKey}T12:00:00Z`));
}

function formatLongDate(dateKey: string): string {
  return parseYmdLocal(dateKey).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(dateKey: string): string {
  return parseYmdLocal(dateKey).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function PastReflectionsScreen() {
  const insets = useSafeAreaInsets();
  const byDay = useFaithDailyStore((s) => s.byDay);
  const [selected, setSelected] = useState<PastReflection | null>(null);
  const [verseInfo, setVerseInfo] = useState<PastReflection | null>(null);

  const reflections = useMemo<PastReflection[]>(() => {
    return Object.entries(byDay)
      .filter(([, day]) => day.journalLine.trim().length > 0)
      .map(([dateKey, day]) => {
        const reading = readingForDateKey(dateKey);
        return {
          dateKey,
          text: day.journalLine.trim(),
          done: day.journalDone,
          reference: reading.reference,
          title: reading.title,
          passage: reading.passage,
        };
      })
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [byDay]);

  return (
    <View style={styles.screen}>
      <SunriseBackdrop height={insets.top + 210} horizonY={insets.top + 72} />

      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.onBackground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title} numberOfLines={1}>
            Past reflections
          </Text>
          <Text style={styles.titleSub} numberOfLines={1}>
            {reflections.length === 0
              ? 'None yet'
              : `${reflections.length} saved`}
          </Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}>

        {reflections.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="auto-stories" size={28} color={theme.colors.champagne} />
            <Text style={styles.emptyTitle}>No reflections yet</Text>
            <Text style={styles.emptyMuted}>
              Write a reflection on the Faith tab and it will show up here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {reflections.map((item) => (
              <Pressable
                key={item.dateKey}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => setSelected(item)}
                accessibilityRole="button"
                accessibilityLabel={`${formatShortDate(item.dateKey)}. ${item.text}`}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardDate}>{formatShortDate(item.dateKey)}</Text>
                  <View style={styles.cardTopIcons}>
                    <Pressable
                      onPress={() => setVerseInfo(item)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Verse for ${item.reference}`}
                      style={({ pressed }) => pressed && styles.pressed}>
                      <MaterialIcons
                        name="info-outline"
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </Pressable>
                    {item.done ? (
                      <MaterialIcons name="check-circle" size={18} color={theme.colors.champagne} />
                    ) : null}
                  </View>
                </View>
                <Text style={styles.cardRef} numberOfLines={1}>
                  {item.reference}
                </Text>
                <Text style={styles.cardText} numberOfLines={4}>
                  {item.text}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={selected != null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalDate}>
                {selected ? formatLongDate(selected.dateKey) : ''}
              </Text>
              <Pressable onPress={() => setSelected(null)} hitSlop={12} accessibilityLabel="Close">
                <MaterialIcons name="close" size={22} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>{selected?.text}</Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={verseInfo != null}
        animationType="fade"
        transparent
        onRequestClose={() => setVerseInfo(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setVerseInfo(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalKicker}>That day&apos;s study</Text>
                <Text style={styles.modalRef}>{verseInfo?.reference}</Text>
              </View>
              <Pressable
                onPress={() => setVerseInfo(null)}
                hitSlop={12}
                accessibilityLabel="Close">
                <MaterialIcons name="close" size={22} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            </View>
            {verseInfo?.title ? (
              <Text style={styles.modalVerseTitle}>{verseInfo.title}</Text>
            ) : null}
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>{verseInfo?.passage}</Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
  },
  titleSub: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  list: { gap: 10 },
  card: {
    ...frostedTile,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTopIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardDate: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.onBackground,
  },
  cardRef: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.4,
    color: theme.colors.champagne,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardText: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.onSurfaceVariant,
  },
  emptyBox: {
    ...frostedTile,
    alignItems: 'center',
    gap: 10,
    padding: 28,
  },
  emptyTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
  },
  emptyMuted: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  modalHeaderText: { flex: 1 },
  modalDate: {
    flex: 1,
    fontFamily: theme.fonts.headlineBold,
    fontSize: 21,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
  },
  modalKicker: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  modalRef: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 21,
    letterSpacing: -0.3,
    color: theme.colors.onBackground,
  },
  modalVerseTitle: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  modalScroll: { flexGrow: 0 },
  modalText: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 26,
    color: theme.colors.onBackground,
  },
});
