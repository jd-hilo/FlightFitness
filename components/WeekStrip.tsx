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
    width: 48,
    paddingVertical: 10,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillActive: {
    backgroundColor: theme.colors.glassStrong,
    borderWidth: 1,
    borderColor: theme.colors.glassEdge,
  },
  dow: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  dowActive: {
    color: theme.colors.onBackground,
  },
  dom: {
    fontFamily: theme.fonts.labelBold,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  domActive: {
    color: theme.colors.gold,
  },
});
