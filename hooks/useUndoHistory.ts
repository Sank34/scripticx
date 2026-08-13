"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UndoHistoryOptions<T> = {
  clone?: (value: T) => T;
  debounceMs?: number;
  isEqual?: (left: T, right: T) => boolean;
  limit?: number;
  onApply: (value: T) => void;
  value: T;
};

type UndoHistoryResult<T> = {
  canRedo: boolean;
  canUndo: boolean;
  flush: () => void;
  redo: () => boolean;
  reset: (value: T) => void;
  undo: () => boolean;
};

function defaultClone<T>(value: T): T {
  return structuredClone(value);
}

function defaultIsEqual<T>(left: T, right: T) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Tracks a controlled value and groups bursts of changes into a single undo step.
 * This is particularly useful for editors where typing and pointer moves produce
 * many consecutive React state updates.
 */
export function useUndoHistory<T>({
  clone,
  debounceMs = 400,
  isEqual,
  limit = 100,
  onApply,
  value,
}: UndoHistoryOptions<T>): UndoHistoryResult<T> {
  const cloneValue = clone ?? defaultClone<T>;
  const compareValues = isEqual ?? defaultIsEqual<T>;
  const [initialValue] = useState(() => cloneValue(value));
  const cloneRef = useRef(cloneValue);
  const isEqualRef = useRef(compareValues);
  const onApplyRef = useRef(onApply);
  const currentRef = useRef<T>(initialValue);
  const pendingBaseRef = useRef<{ value: T } | null>(null);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const ignoredValueRef = useRef<{ value: T } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [availability, setAvailability] = useState({
    canRedo: false,
    canUndo: false,
  });

  useEffect(() => {
    cloneRef.current = cloneValue;
    isEqualRef.current = compareValues;
    onApplyRef.current = onApply;
  }, [cloneValue, compareValues, onApply]);

  const syncAvailability = useCallback(() => {
    const next = {
      canRedo: futureRef.current.length > 0,
      canUndo: pendingBaseRef.current !== null || pastRef.current.length > 0,
    };

    setAvailability((current) =>
      current.canRedo === next.canRedo && current.canUndo === next.canUndo
        ? current
        : next
    );
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const commitPending = useCallback(() => {
    clearTimer();
    const pendingEntry = pendingBaseRef.current;
    if (pendingEntry === null) return;
    const pendingBase = pendingEntry.value;

    if (!isEqualRef.current(pendingBase, currentRef.current)) {
      pastRef.current.push(cloneRef.current(pendingBase));
      if (pastRef.current.length > limit) {
        pastRef.current.splice(0, pastRef.current.length - limit);
      }
    }

    pendingBaseRef.current = null;
    syncAvailability();
  }, [clearTimer, limit, syncAvailability]);

  useEffect(() => {
    const next = cloneRef.current(value);
    const ignoredValue = ignoredValueRef.current;

    if (ignoredValue && isEqualRef.current(ignoredValue.value, next)) {
      ignoredValueRef.current = null;
      currentRef.current = next;
      return;
    }

    if (ignoredValue) {
      ignoredValueRef.current = null;
    }

    if (isEqualRef.current(currentRef.current, next)) return;

    if (pendingBaseRef.current === null) {
      pendingBaseRef.current = { value: cloneRef.current(currentRef.current) };
    }

    currentRef.current = next;
    futureRef.current = [];
    clearTimer();
    timerRef.current = setTimeout(commitPending, debounceMs);
    syncAvailability();
  }, [clearTimer, commitPending, debounceMs, syncAvailability, value]);

  useEffect(
    () => () => {
      clearTimer();
    },
    [clearTimer]
  );

  const undo = useCallback(() => {
    commitPending();
    if (pastRef.current.length === 0) {
      syncAvailability();
      return false;
    }
    const previous = pastRef.current.pop() as T;

    futureRef.current.push(cloneRef.current(currentRef.current));
    const next = cloneRef.current(previous);
    currentRef.current = next;
    ignoredValueRef.current = { value: cloneRef.current(next) };
    onApplyRef.current(cloneRef.current(next));
    syncAvailability();
    return true;
  }, [commitPending, syncAvailability]);

  const redo = useCallback(() => {
    commitPending();
    if (futureRef.current.length === 0) {
      syncAvailability();
      return false;
    }
    const nextValue = futureRef.current.pop() as T;

    pastRef.current.push(cloneRef.current(currentRef.current));
    if (pastRef.current.length > limit) {
      pastRef.current.splice(0, pastRef.current.length - limit);
    }

    const next = cloneRef.current(nextValue);
    currentRef.current = next;
    ignoredValueRef.current = { value: cloneRef.current(next) };
    onApplyRef.current(cloneRef.current(next));
    syncAvailability();
    return true;
  }, [commitPending, limit, syncAvailability]);

  const reset = useCallback(
    (nextValue: T) => {
      clearTimer();
      const next = cloneRef.current(nextValue);
      pastRef.current = [];
      futureRef.current = [];
      pendingBaseRef.current = null;
      currentRef.current = next;
      ignoredValueRef.current = { value: cloneRef.current(next) };
      syncAvailability();
    },
    [clearTimer, syncAvailability]
  );

  return {
    ...availability,
    flush: commitPending,
    redo,
    reset,
    undo,
  };
}
