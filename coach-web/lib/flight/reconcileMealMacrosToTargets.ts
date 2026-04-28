/**
 * Adjusts per-meal macros so each day's totals match `macroTargets`.
 * Keep in sync with `lib/reconcileMealMacrosToTargets.ts` in the mobile app.
 */

type MacroRecord = Record<string, unknown>;

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

function distributeIntByWeights(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const safeTotal = Math.max(0, Math.round(total));
  const sumW = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (sumW < 1e-6) {
    const base = Math.floor(safeTotal / n);
    const rem = safeTotal - base * n;
    return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
  }
  const raw = weights.map((w) => (safeTotal * Math.max(0, w)) / sumW);
  const floors = raw.map((x) => Math.floor(x));
  let remainder = safeTotal - floors.reduce((a, b) => a + b, 0);
  const order = floors
    .map((f, i) => ({ i, frac: raw[i]! - f }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  let k = 0;
  while (remainder > 0 && order.length > 0) {
    out[order[k % order.length]!.i]++;
    remainder--;
    k++;
  }
  return out;
}

function atwaterKcal(p: number, c: number, f: number): number {
  return Math.round(4 * p + 4 * c + 9 * f);
}

export function reconcileMealMacrosToTargetsInPlan(plan: Record<string, unknown>): void {
  const mtRaw = plan.macroTargets;
  if (!mtRaw || typeof mtRaw !== 'object') return;

  const mt = mtRaw as MacroRecord;
  const Tk = num(mt.calories);
  const Tp = num(mt.proteinG);
  const Tc = num(mt.carbsG);
  const Tf = num(mt.fatG);
  if (Tk < 400 || Tp < 20 || Tc < 20 || Tf < 10) return;

  const days = plan.mealsByDay;
  if (!Array.isArray(days)) return;

  plan.mealsByDay = days.map((day) => {
    if (!Array.isArray(day) || day.length === 0) return day;

    const meals = day.filter(
      (m): m is MacroRecord =>
        m != null && typeof m === 'object' && typeof (m as MacroRecord).macros === 'object'
    );
    if (meals.length === 0) return day;

    const oldP: number[] = [];
    const oldC: number[] = [];
    const oldF: number[] = [];
    for (const m of meals) {
      const mac = m.macros as MacroRecord;
      oldP.push(Math.max(0, num(mac.proteinG)));
      oldC.push(Math.max(0, num(mac.carbsG)));
      oldF.push(Math.max(0, num(mac.fatG)));
    }

    const newP = distributeIntByWeights(Math.round(Tp), oldP);
    const newC = distributeIntByWeights(Math.round(Tc), oldC);
    const newF = distributeIntByWeights(Math.round(Tf), oldF);

    const updated = day.map((meal) => {
      if (!meal || typeof meal !== 'object' || !(meal as MacroRecord).macros) return meal;
      const m = meal as MacroRecord;
      const idx = meals.indexOf(m);
      if (idx < 0) return meal;

      const p = newP[idx] ?? 0;
      const c = newC[idx] ?? 0;
      const f = newF[idx] ?? 0;
      const kcal = atwaterKcal(p, c, f);
      return {
        ...m,
        macros: {
          ...(m.macros as MacroRecord),
          proteinG: p,
          carbsG: c,
          fatG: f,
          kcal,
        },
      };
    });

    const sumK = updated.reduce((s, mealUnknown) => {
      if (!mealUnknown || typeof mealUnknown !== 'object') return s;
      const mealRow = mealUnknown as MacroRecord;
      if (!mealRow.macros || typeof mealRow.macros !== 'object') return s;
      const k = num((mealRow.macros as MacroRecord).kcal);
      return s + k;
    }, 0);

    if (sumK > 0 && Math.abs(sumK - Tk) > 3) {
      const factor = Tk / sumK;
      return updated.map((meal) => {
        if (!meal || typeof meal !== 'object' || !(meal as MacroRecord).macros) return meal;
        const m = meal as MacroRecord;
        const mac = { ...(m.macros as MacroRecord) };
        const k = Math.max(50, Math.round(num(mac.kcal) * factor));
        return { ...m, macros: { ...mac, kcal: k } };
      });
    }

    return updated;
  });
}
