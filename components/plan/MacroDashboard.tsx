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
  /** Tighter layout and type for welcome / marketing slides. */
  compact?: boolean;
};

export function MacroDashboard({
  targets,
  loggedKcal = 0,
  loggedProtein = 0,
  loggedCarbs = 0,
  loggedFat = 0,
  compact = false,
}: Props) {
  const kcalPct = Math.min(1, loggedKcal / targets.calories);
  const pPct = Math.min(1, loggedProtein / targets.proteinG);
  const cPct = Math.min(1, loggedCarbs / targets.carbsG);
  const fPct = Math.min(1, loggedFat / targets.fatG);
  const deficit = Math.max(0, targets.calories - loggedKcal);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View>
          <Text style={[styles.heroKicker, compact && styles.heroKickerCompact]}>
            Energy quota
          </Text>
          <View style={[styles.heroRow, compact && styles.heroRowCompact]}>
            <Text style={[styles.heroNum, compact && styles.heroNumCompact]}>
              {targets.calories.toLocaleString()}
            </Text>
            <Text style={[styles.heroUnit, compact && styles.heroUnitCompact]}>
              KCAL
            </Text>
          </View>
        </View>
        <View style={[styles.heroBarCol, compact && styles.heroBarColCompact]}>
          <View style={[styles.heroMeta, compact && styles.heroMetaCompact]}>
            <Text style={[styles.metaMuted, compact && styles.metaCompact]}>
              LOGGED: {loggedKcal.toLocaleString()}
            </Text>
            <Text style={[styles.metaGold, compact && styles.metaCompact]}>
              LEFT: {deficit.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.barTrack, compact && styles.barTrackCompact]}>
            <LinearGradient
              colors={[theme.colors.gold, theme.colors.orange]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${kcalPct * 100}%` }]}
            />
          </View>
        </View>
      </View>
      <View style={[styles.grid, compact && styles.gridCompact]}>
        <MacroTile
          compact={compact}
          label="Protein target"
          current={loggedProtein}
          target={targets.proteinG}
          pct={pPct}
        />
        <MacroTile
          compact={compact}
          label="Carbs target"
          current={loggedCarbs}
          target={targets.carbsG}
          pct={cPct}
        />
        <MacroTile
          compact={compact}
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
  compact,
  label,
  current,
  target,
  pct,
}: {
  compact: boolean;
  label: string;
  current: number;
  target: number;
  pct: number;
}) {
  return (
    <View style={[styles.tile, compact && styles.tileCompact]}>
      <Text style={[styles.tileLabel, compact && styles.tileLabelCompact]}>{label}</Text>
      <View style={[styles.tileRow, compact && styles.tileRowCompact]}>
        <Text style={[styles.tileNum, compact && styles.tileNumCompact]}>
          {Math.round(current)}
        </Text>
        <Text style={[styles.tileSlash, compact && styles.tileSlashCompact]}>
          / {target}G
        </Text>
      </View>
      <View style={[styles.thinTrack, compact && styles.thinTrackCompact]}>
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
  wrapCompact: { marginBottom: 6, gap: 1 },
  heroCompact: {
    padding: 10,
    gap: 8,
  },
  heroRowCompact: { gap: 4 },
  heroKickerCompact: { fontSize: 8, marginBottom: 1, letterSpacing: 1.5 },
  heroNumCompact: { fontSize: 26 },
  heroUnitCompact: { fontSize: 11 },
  heroBarColCompact: { minWidth: 96 },
  heroMetaCompact: { marginBottom: 4 },
  metaCompact: { fontSize: 8, letterSpacing: 0.5 },
  barTrackCompact: { height: 5 },
  gridCompact: { gap: 2 },
  tileCompact: { padding: 8, minWidth: 72 },
  tileLabelCompact: { fontSize: 8, marginBottom: 5, letterSpacing: 1 },
  tileRowCompact: { marginBottom: 6, gap: 2 },
  tileNumCompact: { fontSize: 17 },
  tileSlashCompact: { fontSize: 9 },
  thinTrackCompact: { height: 2 },
});
