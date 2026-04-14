/**
 * Coerce common OpenAI JSON slips before strict Zod parsing (reps as number, slot casing, etc.).
 */
export function normalizeWeekPlanFromAI(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const o = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...o };
  const slots = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

  if (!o.mealsByDay || !Array.isArray(o.mealsByDay)) {
    out.mealsByDay = [[], [], [], [], [], [], []];
  }

  if (Array.isArray(out.mealsByDay)) {
    let days = out.mealsByDay as unknown[];
    while (days.length < 7) days = [...days, []];
    if (days.length > 7) days = days.slice(0, 7);
    out.mealsByDay = days.map((day, di) => {
      if (!Array.isArray(day)) return day;
      return day.map((meal, mi) => {
        if (!meal || typeof meal !== 'object') return meal;
        const m = { ...(meal as Record<string, unknown>) };
        if (typeof m.id !== 'string' || String(m.id).trim() === '') {
          m.id = `m-${di}-${mi}`;
        }
        if (m.recipe === null) delete m.recipe;
        if (m.imageKeyword === null) delete m.imageKeyword;
        if (typeof m.description !== 'string') {
          m.description = String(m.description ?? '');
        }
        if (typeof m.name !== 'string') {
          m.name = String(m.name ?? 'Meal');
        }
        if (typeof m.slot === 'string') {
          const sl = m.slot.trim().toLowerCase();
          m.slot = slots.has(sl) ? sl : 'lunch';
        } else {
          m.slot = 'lunch';
        }
        if (m.macros && typeof m.macros === 'object') {
          const mac = { ...(m.macros as Record<string, unknown>) };
          for (const k of ['proteinG', 'carbsG', 'fatG', 'kcal'] as const) {
            const v = mac[k];
            if (typeof v === 'string' && v !== '') {
              const n = Number(v);
              if (!Number.isNaN(n)) mac[k] = n;
            }
          }
          m.macros = mac;
        }
        return m;
      });
    });
  }

  if (!o.workoutsByDay || !Array.isArray(o.workoutsByDay)) {
    out.workoutsByDay = [null, null, null, null, null, null, null];
  }

  if (Array.isArray(out.workoutsByDay)) {
    let wd = out.workoutsByDay as unknown[];
    while (wd.length < 7) wd = [...wd, null];
    if (wd.length > 7) wd = wd.slice(0, 7);
    out.workoutsByDay = wd.map((w, idx) => {
      if (w == null || typeof w !== 'object') return null;
      const row = { ...(w as Record<string, unknown>) };
      if (typeof row.dayIndex !== 'number' || Number.isNaN(row.dayIndex)) {
        row.dayIndex = idx;
      }
      if (typeof row.title !== 'string' || row.title.trim() === '') {
        row.title = 'Training';
      }
      const rawEx = row.exercises;
      const list = Array.isArray(rawEx)
        ? rawEx
        : rawEx == null
          ? []
          : [];
      row.exercises = list
        .filter((ex): ex is Record<string, unknown> => ex != null && typeof ex === 'object')
        .map((ex, j) => {
          const e = { ...ex };
          if (typeof e.id !== 'string' || e.id.trim() === '') {
            e.id = `ex-${idx}-${j}`;
          }
          if (typeof e.name !== 'string' || e.name.trim() === '') {
            e.name = 'Exercise';
          }
          if (typeof e.reps === 'number') e.reps = String(e.reps);
          else if (e.reps == null || typeof e.reps !== 'string') {
            e.reps = String(e.reps ?? '');
          }
          if (typeof e.sets === 'string') {
            const n = Number(e.sets);
            e.sets = Number.isNaN(n) ? 3 : n;
          } else if (typeof e.sets !== 'number' || Number.isNaN(e.sets)) {
            e.sets = 3;
          }
          if (typeof e.restSec === 'string') {
            const n = Number(e.restSec);
            e.restSec = Number.isNaN(n) ? 60 : n;
          } else if (typeof e.restSec !== 'number' || Number.isNaN(e.restSec)) {
            e.restSec = 60;
          }
          if (e.notes === null || e.notes === undefined) {
            delete e.notes;
          } else if (typeof e.notes !== 'string') {
            e.notes = String(e.notes);
          }
          return e;
        });
      return row;
    });
  }

  if (o.macroTargets && typeof o.macroTargets === 'object') {
    const mt = { ...(o.macroTargets as Record<string, unknown>) };
    for (const k of ['calories', 'proteinG', 'carbsG', 'fatG'] as const) {
      const v = mt[k];
      if (typeof v === 'string' && v !== '') {
        const n = Number(v);
        if (!Number.isNaN(n)) mt[k] = n;
      }
    }
    out.macroTargets = mt;
  }

  if (!Array.isArray(o.groceryList)) {
    out.groceryList = [];
  } else {
    out.groceryList = o.groceryList
      .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
      .map((g) => {
        const row = { ...g };
        if (row.quantity === null || row.quantity === undefined) delete row.quantity;
        else if (typeof row.quantity !== 'string') row.quantity = String(row.quantity);
        if (row.category === null || row.category === undefined) delete row.category;
        else if (typeof row.category !== 'string') row.category = String(row.category);
        if (typeof row.name !== 'string') row.name = String(row.name ?? 'Item');
        return row;
      });
  }

  return out;
}
