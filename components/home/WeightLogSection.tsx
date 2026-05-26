import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NumberStepper } from '@/components/plan/NumberStepper';
import { WeightProgressChart } from '@/components/home/WeightProgressChart';
import { theme } from '@/constants/theme';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useWeightLogStore } from '@/stores/weightLogStore';

type Props = {
  dateKey: string;
};

export function WeightLogSection({ dateKey }: Props) {
  const onboardingWeight = useOnboardingStore((s) => s.answers.currentWeightLb);
  const targetWeight = useOnboardingStore((s) => s.answers.targetWeightLb);
  const rawEntries = useWeightLogStore((s) => s.entries);
  const logWeight = useWeightLogStore((s) => s.logWeight);

  const entries = useMemo(
    () => [...rawEntries].sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    [rawEntries]
  );

  const todayEntry = useMemo(
    () => entries.find((e) => e.dateKey === dateKey),
    [entries, dateKey]
  );

  const latestEntry = entries[entries.length - 1];
  const currentWeight = latestEntry?.weightLb ?? onboardingWeight;
  const draftDefault = todayEntry?.weightLb ?? currentWeight;

  const [draft, setDraft] = useState(draftDefault);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(todayEntry?.weightLb ?? currentWeight);
  }, [dateKey, todayEntry?.weightLb, currentWeight]);

  const chartEntries = useMemo(() => {
    if (entries.length === 0) {
      if (onboardingWeight > 0) {
        return [
          {
            dateKey: 'start',
            weightLb: onboardingWeight,
            updatedAt: 'onboarding-baseline',
          },
        ];
      }
      return [];
    }

    const hasStartPoint = entries.some(
      (e) => e.dateKey === 'start' || e.weightLb === onboardingWeight
    );
    if (onboardingWeight > 0 && !hasStartPoint) {
      return [
        {
          dateKey: 'start',
          weightLb: onboardingWeight,
          updatedAt: 'onboarding-baseline',
        },
        ...entries,
      ];
    }
    return entries;
  }, [entries, onboardingWeight]);

  const onSave = () => {
    logWeight(dateKey, draft);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Body weight</Text>
      <View style={styles.currentRow}>
        <View>
          <Text style={styles.currentLabel}>Current</Text>
          <Text style={styles.currentVal}>{currentWeight} lb</Text>
        </View>
        {targetWeight > 0 ? (
          <View style={styles.targetBox}>
            <Text style={styles.targetLabel}>Target</Text>
            <Text style={styles.targetVal}>{targetWeight} lb</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.logLabel}>Log today</Text>
      <NumberStepper
        value={draft}
        onChange={setDraft}
        min={50}
        max={600}
        step={0.5}
        suffix="lb"
        allowKeyboardInput
        keyboardType="decimal-pad"
      />
      <Pressable style={styles.saveBtn} onPress={onSave}>
        <Text style={styles.saveBtnTxt}>
          {savedFlash ? 'Saved' : todayEntry ? 'Update today' : 'Save entry'}
        </Text>
      </Pressable>

      <Text style={styles.chartTitle}>Progress</Text>
      <WeightProgressChart entries={chartEntries} targetWeightLb={targetWeight} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    padding: 16,
    marginBottom: 16,
  },
  kicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  currentLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  currentVal: {
    fontFamily: theme.fonts.headline,
    fontSize: 36,
    color: theme.colors.onBackground,
  },
  targetBox: { alignItems: 'flex-end' },
  targetLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  targetVal: {
    fontFamily: theme.fonts.headlineBold,
    fontSize: 18,
    color: theme.colors.gold,
  },
  logLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  saveBtn: {
    marginTop: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnTxt: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    textTransform: 'uppercase',
  },
  chartTitle: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
});
