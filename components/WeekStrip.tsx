import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { weekdayAbbrevUpper, weekDatesFromStart } from '@/lib/weekUtils';

type Props = {
  weekStartYmd: string;
  selectedIndex: number;
  onSelect: (i: number) => void;
};

export function WeekStrip({ weekStartYmd, selectedIndex, onSelect }: Props) {
  const dates = weekDatesFromStart(weekStartYmd);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}>
      {dates.map((d, i) => {
        const active = i === selectedIndex;
        return (
          <Pressable
            key={i}
            onPress={() => onSelect(i)}
            style={[styles.pill, active && styles.pillActive]}>
            <Text style={[styles.dow, active && styles.dowActive]}>
              {weekdayAbbrevUpper(d)}
            </Text>
            <Text style={[styles.dom, active && styles.domActive]}>
              {d.getDate()}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 8,
  },
  pill: {
    width: 64,
    minHeight: 80,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: theme.colors.gold,
    minHeight: 88,
    marginTop: -4,
    borderColor: theme.colors.gold,
    shadowColor: theme.colors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  dow: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dowActive: {
    color: theme.colors.onGold,
    fontFamily: theme.fonts.headlineBold,
  },
  dom: {
    fontFamily: theme.fonts.headline,
    fontSize: 20,
    color: theme.colors.onBackground,
    marginTop: 4,
  },
  domActive: {
    color: theme.colors.onGold,
    fontSize: 24,
  },
});
