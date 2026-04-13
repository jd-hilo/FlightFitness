import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { MacroTargets } from '@/types/plan';

type Props = {
  targets: MacroTargets;
  loggedKcal?: number;
  loggedProtein?: number;
  loggedCarbs?: number;
  loggedFat?: number;
};

export function MacroDashboard({
  targets,
  loggedKcal = 0,
  loggedProtein = 0,
  loggedCarbs = 0,
  loggedFat = 0,
}: Props) {
  const kcalPct = Math.min(1, loggedKcal / targets.calories);
  const pPct = Math.min(1, loggedProtein / targets.proteinG);
  const cPct = Math.min(1, loggedCarbs / targets.carbsG);
  const fPct = Math.min(1, loggedFat / targets.fatG);
  const deficit = Math.max(0, targets.calories - loggedKcal);

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroKicker}>Energy quota</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroNum}>
              {targets.calories.toLocaleString()}
            </Text>
            <Text style={styles.heroUnit}>KCAL</Text>
          </View>
        </View>
        <View style={styles.heroBarCol}>
          <View style={styles.heroMeta}>
            <Text style={styles.metaMuted}>
              LOGGED: {loggedKcal.toLocaleString()}
            </Text>
            <Text style={styles.metaGold}>LEFT: {deficit.toLocaleString()}</Text>
          </View>
          <View style={styles.barTrack}>
            <LinearGradient
              colors={[theme.colors.gold, theme.colors.orange]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${kcalPct * 100}%` }]}
            />
          </View>
        </View>
      </View>
      <View style={styles.grid}>
        <MacroTile
          label="Protein target"
          current={loggedProtein}
          target={targets.proteinG}
          pct={pPct}
        />
        <MacroTile
          label="Carbs target"
          current={loggedCarbs}
          target={targets.carbsG}
          pct={cPct}
        />
        <MacroTile
          label="Fats target"
          current={loggedFat}
          target={targets.fatG}
          pct={fPct}
        />
      </View>
    </View>
  );
}

function MacroTile({
  label,
  current,
  target,
  pct,
}: {
  label: string;
  current: number;
  target: number;
  pct: number;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <View style={styles.tileRow}>
        <Text style={styles.tileNum}>{Math.round(current)}</Text>
        <Text style={styles.tileSlash}>/ {target}G</Text>
      </View>
      <View style={styles.thinTrack}>
        <View style={[styles.thinFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24, gap: 4 },
  hero: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  heroKicker: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  heroNum: {
    fontFamily: theme.fonts.headline,
    fontSize: 48,
    color: theme.colors.onBackground,
  },
  heroUnit: {
    fontFamily: theme.fonts.label,
    fontSize: 18,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  heroBarCol: { flex: 1, minWidth: 160 },
  heroMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaMuted: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  metaGold: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: theme.colors.gold,
    letterSpacing: 1,
  },
  barTrack: {
    height: 10,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    overflow: 'hidden',
  },
  barFill: { height: '100%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineStrong,
    padding: 20,
  },
  tileLabel: {
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  tileRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 16 },
  tileNum: {
    fontFamily: theme.fonts.headline,
    fontSize: 32,
    color: theme.colors.onBackground,
  },
  tileSlash: {
    fontFamily: theme.fonts.label,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  thinTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  thinFill: {
    height: '100%',
    backgroundColor: theme.colors.gold,
  },
});
