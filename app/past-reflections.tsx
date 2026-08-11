import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
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
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(255,255,255,0.12)', 'rgba(255,215,0,0.10)', 'transparent']}
        locations={[0, 0.45, 1]}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <ScreenHeader />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headingRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={theme.colors.gold} />
          </Pressable>
          <Text
            style={styles.heading}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}>
            Past reflections
          </Text>
        </View>
        <Text style={styles.lead}>
          Every reflection you&apos;ve written, kept in one place.
        </Text>

        {reflections.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons
              name="auto-stories"
              size={28}
              color={theme.colors.gold}
            />
            <Text style={styles.emptyTitle}>No reflections yet</Text>
            <Text style={styles.emptyMuted}>
              Write a reflection on the Faith tab and it will show up here.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {reflections.map((item) => (
              <Pressable
                key={item.dateKey}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => setSelected(item)}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardDate}>{formatShortDate(item.dateKey)}</Text>
                  <View style={styles.cardTopIcons}>
                    <Pressable
                      onPress={() => setVerseInfo(item)}
                      hitSlop={10}
                      style={({ pressed }) => pressed && styles.infoPressed}>
                      <MaterialIcons
                        name="info-outline"
                        size={16}
                        color={theme.colors.gold}
                      />
                    </Pressable>
                    {item.done ? (
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color={theme.colors.gold}
                      />
                    ) : null}
                  </View>
                </View>
                <Text style={styles.cardRef} numberOfLines={1}>
                  {item.reference}
                </Text>
                <Text style={styles.cardText} numberOfLines={5}>
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
              <Pressable onPress={() => setSelected(null)} hitSlop={12}>
                <MaterialIcons
                  name="close"
                  size={22}
                  color={theme.colors.onSurfaceVariant}
                />
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
                <Text style={styles.modalKicker}>Today&apos;s study</Text>
                <Text style={styles.modalRef}>{verseInfo?.reference}</Text>
              </View>
              <Pressable onPress={() => setVerseInfo(null)} hitSlop={12}>
                <MaterialIcons
                  name="close"
                  size={22}
                  color={theme.colors.onSurfaceVariant}
                />
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
  root: { flex: 1, backgroundColor: '#050505', overflow: 'hidden' },
  topGlow: {
    position: 'absolute',
    left: -60,
    right: -60,
    top: 0,
    height: 320,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  backBtn: {
    marginLeft: -2,
  },
  heading: {
    flex: 1,
    minWidth: 0,
    fontFamily: theme.fonts.headline,
    fontSize: 26,
    lineHeight: 30,
    color: theme.colors.onBackground,
    textTransform: 'uppercase',
  },
  scroll: { paddingHorizontal: 22, paddingTop: 8 },
  lead: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.58)',
    lineHeight: 21,
    marginBottom: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 146,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    paddingHorizontal: 14,
    paddingVertical: 15,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.92,
    borderColor: 'rgba(255,255,255,0.82)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTopIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoPressed: {
    opacity: 0.6,
  },
  cardDate: {
    fontFamily: theme.fonts.headline,
    fontSize: 14,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardRef: {
    fontFamily: theme.fonts.label,
    fontSize: 11,
    color: theme.colors.gold,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  cardText: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.62)',
  },
  emptyBox: {
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: 28,
    marginTop: 12,
  },
  emptyTitle: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 16,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  emptyMuted: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.58)',
    textAlign: 'center',
    lineHeight: 19,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#121212',
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  modalDate: {
    fontFamily: theme.fonts.headline,
    fontSize: 18,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  modalKicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  modalRef: {
    fontFamily: theme.fonts.headline,
    fontSize: 18,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  modalVerseTitle: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  modalScroll: { flexGrow: 0 },
  modalText: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.86)',
  },
});
