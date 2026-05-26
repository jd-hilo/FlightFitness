/** Deno-compatible exercise normalization (keep in sync with lib/exerciseNormalize.ts). */

type ExerciseSetRow = {
  id: string;
  targetReps: string;
  actualReps?: string;
  weightLb?: number;
  restSec?: number;
  rpe?: number;
  completed?: boolean;
};

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSec: number;
  notes?: string;
  catalogExerciseId?: string;
  setRows?: ExerciseSetRow[];
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultSetRow(
  targetReps: string,
  restSec: number,
  id?: string
): ExerciseSetRow {
  return {
    id: id ?? newId('set'),
    targetReps,
    restSec,
    completed: false,
  };
}

function ensureExerciseSetRows(exercise: Exercise): Exercise {
  if (exercise.setRows && exercise.setRows.length > 0) {
    return syncExerciseAggregateFromSetRows(exercise);
  }
  const count = Math.max(1, exercise.sets);
  const reps = exercise.reps.trim() || '8-10';
  const setRows = Array.from({ length: count }, (_, i) =>
    defaultSetRow(reps, exercise.restSec, `set-${exercise.id}-${i}`)
  );
  return { ...exercise, setRows };
}

function syncExerciseAggregateFromSetRows(exercise: Exercise): Exercise {
  const rows = exercise.setRows ?? [];
  if (rows.length === 0) return exercise;
  const first = rows[0]!;
  const reps = first.targetReps.trim() || exercise.reps || '8-10';
  const restSec = first.restSec ?? exercise.restSec ?? 60;
  return {
    ...exercise,
    sets: rows.length,
    reps,
    restSec,
    setRows: rows.map((row, i) => ({
      ...row,
      id: row.id?.trim() ? row.id : `set-${exercise.id}-${i}`,
      targetReps: row.targetReps?.trim() ? row.targetReps : reps,
      restSec: row.restSec ?? restSec,
    })),
  };
}

export function normalizeExerciseRecord(
  ex: Record<string, unknown>,
  idx: number,
  dayIndex: number
): Record<string, unknown> {
  const e = { ...ex };
  if (typeof e.id !== 'string' || e.id.trim() === '') {
    e.id = `ex-${dayIndex}-${idx}`;
  }
  if (typeof e.name !== 'string' || e.name.trim() === '') {
    e.name = 'Exercise';
  }
  if (typeof e.reps === 'number') e.reps = String(e.reps);
  else if (e.reps == null || typeof e.reps !== 'string') {
    e.reps = String(e.reps ?? '8-10');
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
  if (e.catalogExerciseId === null || e.catalogExerciseId === undefined) {
    delete e.catalogExerciseId;
  } else if (typeof e.catalogExerciseId !== 'string') {
    e.catalogExerciseId = String(e.catalogExerciseId);
  }

  if (Array.isArray(e.setRows)) {
    e.setRows = e.setRows
      .filter((row): row is Record<string, unknown> => row != null && typeof row === 'object')
      .map((row, j) => {
        const r = { ...row };
        if (typeof r.id !== 'string' || r.id.trim() === '') {
          r.id = `set-${String(e.id)}-${j}`;
        }
        if (typeof r.targetReps === 'number') r.targetReps = String(r.targetReps);
        else if (typeof r.targetReps !== 'string' || r.targetReps.trim() === '') {
          r.targetReps = String(e.reps ?? '8-10');
        }
        if (typeof r.actualReps === 'number') r.actualReps = String(r.actualReps);
        else if (r.actualReps != null && typeof r.actualReps !== 'string') {
          r.actualReps = String(r.actualReps);
        } else if (r.actualReps === null || r.actualReps === '') {
          delete r.actualReps;
        }
        for (const k of ['weightLb', 'restSec', 'rpe'] as const) {
          const v = r[k];
          if (v == null) {
            delete r[k];
          } else if (typeof v === 'string') {
            const n = Number(v);
            if (!Number.isNaN(n)) r[k] = n;
            else delete r[k];
          }
        }
        if (typeof r.completed !== 'boolean') delete r.completed;
        return r;
      });
  } else {
    delete e.setRows;
  }

  const parsed = ensureExerciseSetRows(e as unknown as Exercise);
  return parsed as unknown as Record<string, unknown>;
}
