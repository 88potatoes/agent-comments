// ── Comment Commands ────────────────────────────────────────────
// Single entry point for all UI actions.
// UI components call these commands — never useTuiStore or useQueryClient directly.
// Commands are pure wrappers around the store; testable without Ink.
//
// Architecture:
//   UI → useCommentCommands (actions) + useCommentListViewModel (data)
//              ↓
//         Zustand store (internal, never accessed directly by UI)
//
// Layer boundary: this hook takes NO data params. All state comes from
// the store. View model handles any index clamping. editComment is
// wired by the parent since it needs view model data (file/line).

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTuiStore } from '../../store.ts';
import { openInEditor } from '../../openInEditor.ts';

export function useCommentCommands() {
  const queryClient = useQueryClient();

  // ── state reads ─────────────────────────────────────────────

  const hoveredCommentIndex = useTuiStore((s) => s.hoveredCommentIndex);
  const hoveredHelpIndex = useTuiStore((s) => s.hoveredHelpIndex);
  const filter = useTuiStore((s) => s.filter);
  const inputMode = useTuiStore((s) => s.inputMode);
  const showResolved = useTuiStore((s) => s.showResolved);

  // ── setters ─────────────────────────────────────────────────

  const applyPatch = useTuiStore((s) => s.applyPatch);
  const setFilter = useTuiStore((s) => s.setFilter);
  const setHoveredHelpIndex = useTuiStore((s) => s.setHoveredHelpIndex);
  const setInputMode = useTuiStore((s) => s.setInputMode);
  const toggleShowResolved = useTuiStore((s) => s.toggleShowResolved);

  // ── list navigation (no clamping — view model handles it) ───

  const moveUp = useCallback(() => {
    useTuiStore.setState((s) => ({ hoveredCommentIndex: s.hoveredCommentIndex - 1 }));
  }, []);

  const moveDown = useCallback(() => {
    useTuiStore.setState((s) => ({ hoveredCommentIndex: s.hoveredCommentIndex + 1 }));
  }, []);

  // ── filter ──────────────────────────────────────────────────

  const openFilter = useCallback(() => {
    setInputMode('list-filter');
  }, [setInputMode]);

  const clearFilter = useCallback(() => {
    applyPatch({ filter: '', hoveredCommentIndex: 0 });
  }, [applyPatch]);

  const filterType = useCallback(
    (char: string) => {
      setFilter(filter + char);
    },
    [filter, setFilter],
  );

  const filterBackspace = useCallback(() => {
    setFilter(filter.slice(0, -1));
  }, [filter, setFilter]);

  const filterApply = useCallback(() => {
    applyPatch({ inputMode: 'list', hoveredCommentIndex: 0 });
  }, [applyPatch]);

  const filterCancel = useCallback(() => {
    applyPatch({ inputMode: 'list', filter: '' });
  }, [applyPatch]);

  // ── help ────────────────────────────────────────────────────

  const openHelp = useCallback(() => {
    applyPatch({ inputMode: 'help', hoveredHelpIndex: 0 });
  }, [applyPatch]);

  const closeHelp = useCallback(() => {
    applyPatch({ inputMode: 'list', hoveredHelpIndex: 0 });
  }, [applyPatch]);

  const helpMoveUp = useCallback(
    (totalHelpEntries: number) => {
      if (totalHelpEntries <= 0) return;
      setHoveredHelpIndex(Math.max(0, hoveredHelpIndex - 1));
    },
    [hoveredHelpIndex, setHoveredHelpIndex],
  );

  const helpMoveDown = useCallback(
    (totalHelpEntries: number) => {
      if (totalHelpEntries <= 0) return;
      setHoveredHelpIndex(Math.min(hoveredHelpIndex + 1, totalHelpEntries - 1));
    },
    [hoveredHelpIndex, setHoveredHelpIndex],
  );

  const helpActivate = useCallback(
    (actionKey: string, editComment: () => void, deleteComment: () => void) => {
      switch (actionKey) {
        case 'r':
          void queryClient.invalidateQueries({ queryKey: ['comments'] });
          break;
        case 'R':
          toggleShowResolved();
          break;
        case 'e':
          editComment();
          break;
        case 'd':
          deleteComment();
          break;
        case '/':
          setInputMode('list-filter');
          break;
        case 'Esc':
          applyPatch({ filter: '', hoveredCommentIndex: 0 });
          break;
        case 'Enter':
          applyPatch({ inputMode: 'list', hoveredCommentIndex: 0 });
          break;
        case '?':
          // closing is handled by caller
          break;
        case 'q':
          process.exit(0);
          break;
      }
    },
    [queryClient, toggleShowResolved, setInputMode, applyPatch],
  );

  // ── side effects ────────────────────────────────────────────

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['comments'] });
  }, [queryClient]);

  const quit = useCallback(() => {
    process.exit(0);
  }, []);

  // ── derived ─────────────────────────────────────────────────

  const hasFilter = filter.length > 0;

  return {
    // state (read-only by UI)
    inputMode,
    hoveredCommentIndex,
    hoveredHelpIndex,
    filter,
    showResolved,
    hasFilter,

    // commands
    moveUp,
    moveDown,
    openFilter,
    clearFilter,
    toggleResolved: toggleShowResolved,
    filterType,
    filterBackspace,
    filterApply,
    filterCancel,
    openHelp,
    closeHelp,
    helpMoveUp,
    helpMoveDown,
    helpActivate,
    refresh,
    quit,
  };
}