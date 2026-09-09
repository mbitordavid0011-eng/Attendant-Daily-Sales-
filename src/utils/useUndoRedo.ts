import { useState, useRef, useCallback, useEffect } from 'react';

export interface UndoRedoOptions<T> {
  maxHistory?: number;
  debounceMs?: number;
  enableShortcuts?: boolean;
  onUndo?: (state: T) => void;
  onRedo?: (state: T) => void;
}

export interface UndoRedoResult<T> {
  state: T;
  set: (nextState: T | ((prev: T) => T), options?: { immediate?: boolean; skipHistory?: boolean }) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  reset: (newState: T) => void;
  commit: () => void;
}

/**
 * useUndoRedo Hook
 * Provides robust undo and redo state management with debounced typing grouping,
 * explicit action recording, and keyboard shortcuts (Ctrl+Z / Cmd+Z, Ctrl+Y / Cmd+Shift+Z).
 */
export function useUndoRedo<T>(
  initialState: T,
  options: UndoRedoOptions<T> = {}
): UndoRedoResult<T> {
  const {
    maxHistory = 50,
    debounceMs = 350,
    enableShortcuts = true,
    onUndo,
    onRedo,
  } = options;

  const [state, setStateInternal] = useState<T>(initialState);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);

  const stateRef = useRef<T>(state);
  stateRef.current = state;

  const pastRef = useRef<T[]>(past);
  pastRef.current = past;

  const futureRef = useRef<T[]>(future);
  futureRef.current = future;

  const debounceTimerRef = useRef<any>(null);
  const lastCommittedStateRef = useRef<T>(initialState);

  // Commit the current state to history if different from last committed
  const commit = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const current = stateRef.current;
    const lastCommitted = lastCommittedStateRef.current;

    // Only commit if deep/JSON different
    try {
      if (JSON.stringify(current) !== JSON.stringify(lastCommitted)) {
        setPast((prev) => {
          const nextPast = [...prev, lastCommitted];
          if (nextPast.length > maxHistory) {
            return nextPast.slice(nextPast.length - maxHistory);
          }
          return nextPast;
        });
        setFuture([]); // Clear future on new branch
        lastCommittedStateRef.current = current;
      }
    } catch {
      // If circular, just push
      setPast((prev) => [...prev, lastCommitted].slice(-maxHistory));
      setFuture([]);
      lastCommittedStateRef.current = current;
    }
  }, [maxHistory]);

  const set = useCallback(
    (
      nextStateOrFn: T | ((prev: T) => T),
      setOpts: { immediate?: boolean; skipHistory?: boolean } = {}
    ) => {
      const { immediate = false, skipHistory = false } = setOpts;

      const currentState = stateRef.current;
      const nextState =
        typeof nextStateOrFn === 'function'
          ? (nextStateOrFn as (prev: T) => T)(currentState)
          : nextStateOrFn;

      if (skipHistory) {
        setStateInternal(nextState);
        lastCommittedStateRef.current = nextState;
        return;
      }

      if (immediate) {
        commit();
        setStateInternal(nextState);
        lastCommittedStateRef.current = nextState;
      } else {
        // Debounce history snapshot creation for rapid keystrokes
        if (!debounceTimerRef.current) {
          // Record the state BEFORE this typing sequence began
          lastCommittedStateRef.current = currentState;
        }

        setStateInternal(nextState);

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          commit();
        }, debounceMs);
      }
    },
    [commit, debounceMs]
  );

  const undo = useCallback((): boolean => {
    // Flush any pending debounce commit
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const currentPast = pastRef.current;
    if (currentPast.length === 0) return false;

    const previous = currentPast[currentPast.length - 1];
    const newPast = currentPast.slice(0, currentPast.length - 1);
    const current = stateRef.current;

    setPast(newPast);
    setFuture((prev) => [current, ...prev]);
    setStateInternal(previous);
    lastCommittedStateRef.current = previous;

    if (onUndo) {
      onUndo(previous);
    }
    return true;
  }, [onUndo]);

  const redo = useCallback((): boolean => {
    // Flush any pending debounce commit
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const currentFuture = futureRef.current;
    if (currentFuture.length === 0) return false;

    const next = currentFuture[0];
    const newFuture = currentFuture.slice(1);
    const current = stateRef.current;

    setPast((prev) => [...prev, current]);
    setFuture(newFuture);
    setStateInternal(next);
    lastCommittedStateRef.current = next;

    if (onRedo) {
      onRedo(next);
    }
    return true;
  }, [onRedo]);

  const reset = useCallback((newState: T) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setStateInternal(newState);
    setPast([]);
    setFuture([]);
    lastCommittedStateRef.current = newState;
  }, []);

  // Keyboard shortcut support (Ctrl+Z / Cmd+Z for undo, Ctrl+Y / Cmd+Y / Cmd+Shift+Z for redo)
  useEffect(() => {
    if (!enableShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const key = e.key.toLowerCase();

      // Undo: Ctrl+Z (without Shift)
      if (key === 'z' && !e.shiftKey) {
        // If user is inside an input, we want to allow app-level undo when our custom undo handler is active
        if (pastRef.current.length > 0) {
          e.preventDefault();
          undo();
        }
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z
      else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        if (futureRef.current.length > 0) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableShortcuts, undo, redo]);

  return {
    state,
    set,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoCount: past.length,
    redoCount: future.length,
    reset,
    commit,
  };
}
