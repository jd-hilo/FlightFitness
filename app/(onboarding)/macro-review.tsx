import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { AppLoadingCross } from '@/components/AppLoadingCross';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { onboardingStyles as styles } from '@/components/onboarding/onboardingStyles';
import { MacroDashboard } from '@/components/plan/MacroDashboard';
import { recommendMacroTargets } from '@/lib/api/plan';
import type { MacroTargets } from '@/types/plan';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePlanStore } from '@/stores/planStore';

function parseMacroField(raw: string, fallback: number): number {
  const n = parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default function OnboardingMacroReviewScreen() {
  const answers = useOnboardingStore((s) => s.answers);
  const setMacroTargets = usePlanStore((s) => s.setMacroTargets);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<MacroTargets | null>(null);
  const [source, setSource] = useState<'ai' | 'formula'>('formula');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await recommendMacroTargets(answers);
      if (cancelled) return;
      if (res.ok) {
        setDraft(res.macroTargets);
        setSource(res.source);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [answers]);

  const canNext = draft != null && draft.calories >= 400;

  const onNext = () => {
    if (!draft) return;
    setMacroTargets(draft);
    router.push('/(onboarding)/training');
  };

  const updateField = (key: keyof MacroTargets, text: string) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: parseMacroField(text, draft[key]) });
  };

  return (
    <OnboardingShell
      step={8}
      canNext={canNext && !loading}
      backHref="back"
      onNext={onNext}
      nextLabel="Save & continue"
      hideFooter={loading}>
      {loading ? (
        <View style={styles.center}>
          <AppLoadingCross size="large" />
          <Text style={styles.loadingText}>Building your recommended macros…</Text>
        </View>
      ) : draft ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          <Text style={styles.title}>Your recommended macros</Text>
          <Text style={styles.subtitle}>
            {source === 'ai'
              ? 'Personalized from your profile. Adjust anything before you save.'
              : 'Estimated from your profile. Adjust anything before you save.'}
          </Text>
          <MacroDashboard targets={draft} compact />
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Edit targets</Text>
          {(
            [
              ['calories', 'Calories (kcal)'],
              ['proteinG', 'Protein (g)'],
              ['carbsG', 'Carbs (g)'],
              ['fatG', 'Fat (g)'],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={styles.macroFieldRow}>
              <Text style={styles.macroLabel}>{label}</Text>
              <TextInput
                style={styles.macroInput}
                keyboardType="number-pad"
                value={String(draft[key])}
                onChangeText={(t) => updateField(key, t)}
                selectTextOnFocus
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Could not load macros. Go back and try again.</Text>
        </View>
      )}
    </OnboardingShell>
  );
}
