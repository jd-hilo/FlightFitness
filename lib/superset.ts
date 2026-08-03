import { ensureExerciseSetRows } from '@/lib/exerciseNormalize';
import type { Exercise } from '@/types/plan';

export type SetFocus = { exerciseIndex: number; setRowIndex: number };

/** Contiguous indices sharing the same supersetGroupId around `index`. */
export function getContiguousSupersetIndices(
  exercises: Exercise[],
  index: number
): number[] {
  const groupId = exercises[index]?.supersetGroupId?.trim();
  if (!groupId) return [index];

  let start = index;
  while (start > 0 && exercises[start - 1]?.supersetGroupId?.trim() === groupId) {
    start -= 1;
  }
  let end = index;
  while (
    end < exercises.length - 1 &&
    exercises[end + 1]?.supersetGroupId?.trim() === groupId
  ) {
    end += 1;
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function isSupersetMember(exercise: Exercise | undefined): boolean {
  return Boolean(exercise?.supersetGroupId?.trim());
}

/** Letter label within a group: A, B, C… */
export function supersetLetter(exercises: Exercise[], index: number): string | null {
  const indices = getContiguousSupersetIndices(exercises, index);
  if (indices.length < 2) return null;
  const pos = indices.indexOf(index);
  if (pos < 0) return null;
  return String.fromCharCode(65 + pos);
}

export function isFirstInSuperset(exercises: Exercise[], index: number): boolean {
  const indices = getContiguousSupersetIndices(exercises, index);
  return indices.length >= 2 && indices[0] === index;
}

export function isLastInSuperset(exercises: Exercise[], index: number): boolean {
  const indices = getContiguousSupersetIndices(exercises, index);
  return indices.length >= 2 && indices[indices.length - 1] === index;
}

/**
 * Next incomplete set after completing (afterExerciseIndex, afterSetRowIndex).
 * Supersets advance by round: A1 → B1 → A2 → B2…
 */
export function findNextIncompleteSet(
  exercises: Exercise[],
  afterExerciseIndex: number,
  afterSetRowIndex: number
): SetFocus | null {
  const normalized = exercises.map(ensureExerciseSetRows);

  if (afterExerciseIndex < 0) {
    return firstIncompleteInRange(normalized, 0, normalized.length - 1);
  }

  const current = normalized[afterExerciseIndex];
  if (!current) return null;

  const groupId = current.supersetGroupId?.trim();
  if (groupId) {
    const groupIndices = getContiguousSupersetIndices(normalized, afterExerciseIndex);
    if (groupIndices.length >= 2) {
      const pos = groupIndices.indexOf(afterExerciseIndex);

      for (let i = pos + 1; i < groupIndices.length; i++) {
        const ei = groupIndices[i]!;
        const row = normalized[ei]?.setRows?.[afterSetRowIndex];
        if (row && !row.completed) {
          return { exerciseIndex: ei, setRowIndex: afterSetRowIndex };
        }
      }

      for (let setIdx = afterSetRowIndex + 1; setIdx < 64; setIdx++) {
        let anyRowAtSet = false;
        for (const ei of groupIndices) {
          const rows = normalized[ei]?.setRows ?? [];
          if (setIdx < rows.length) {
            anyRowAtSet = true;
            if (!rows[setIdx]?.completed) {
              return { exerciseIndex: ei, setRowIndex: setIdx };
            }
          }
        }
        if (!anyRowAtSet) break;
      }

      const afterGroup = groupIndices[groupIndices.length - 1]!;
      return firstIncompleteInRange(normalized, afterGroup + 1, normalized.length - 1);
    }
  }

  const currentRows = normalized[afterExerciseIndex]?.setRows ?? [];
  for (let rowIndex = afterSetRowIndex + 1; rowIndex < currentRows.length; rowIndex++) {
    if (!currentRows[rowIndex]?.completed) {
      return { exerciseIndex: afterExerciseIndex, setRowIndex: rowIndex };
    }
  }

  return firstIncompleteInRange(
    normalized,
    afterExerciseIndex + 1,
    normalized.length - 1
  );
}

export function findFirstIncompleteSet(exercises: Exercise[]): SetFocus | null {
  return findNextIncompleteSet(exercises, -1, -1);
}

function firstIncompleteInRange(
  normalized: Exercise[],
  from: number,
  to: number
): SetFocus | null {
  for (let exerciseIndex = from; exerciseIndex <= to; exerciseIndex++) {
    const rows = normalized[exerciseIndex]?.setRows ?? [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      if (!rows[rowIndex]?.completed) {
        return { exerciseIndex, setRowIndex: rowIndex };
      }
    }
  }
  return null;
}

/** True when moving A→B within the same round (skip full rest timer). */
export function isIntraSupersetAdvance(
  exercises: Exercise[],
  from: SetFocus,
  to: SetFocus
): boolean {
  if (from.setRowIndex !== to.setRowIndex) return false;
  const fromId = exercises[from.exerciseIndex]?.supersetGroupId?.trim();
  const toId = exercises[to.exerciseIndex]?.supersetGroupId?.trim();
  if (!fromId || !toId || fromId !== toId) return false;
  const group = getContiguousSupersetIndices(exercises, from.exerciseIndex);
  return group.includes(to.exerciseIndex) && group.length >= 2;
}

export function focusLabel(exercises: Exercise[], focus: SetFocus | null): string {
  if (!focus) return 'All sets complete';
  const ex = ensureExerciseSetRows(exercises[focus.exerciseIndex]!);
  const letter = supersetLetter(exercises, focus.exerciseIndex);
  const name = letter ? `${letter}. ${ex.name}` : ex.name;
  return `Next: ${name} · Set ${focus.setRowIndex + 1}`;
}

/** Collapse orphan groups (fewer than 2 members) after unlink/remove. */
export function cleanupSupersetGroups(exercises: Exercise[]): Exercise[] {
  const counts = new Map<string, number>();
  for (const ex of exercises) {
    const id = ex.supersetGroupId?.trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return exercises.map((ex) => {
    const id = ex.supersetGroupId?.trim();
    if (!id) return ex;
    if ((counts.get(id) ?? 0) < 2) {
      const { supersetGroupId: _, ...rest } = ex;
      return rest;
    }
    return ex;
  });
}
