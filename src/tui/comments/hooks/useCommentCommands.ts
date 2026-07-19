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
// Layer boundary: this hook uses CommentRowViewModel for file/line access,
// NOT CommentEntity. The domain entity never crosses into hooks or UI.

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTuiStore, clampIndex } from '../../store.ts';
import { openInEditor } from '../../openInEditor.ts';
import type { CommentRowViewModel } from '../view-model.ts';

interface UseCommentCommandsOptions {
  totalCommentCount: number;
  rows: CommentRowViewModel[];
}

export function useCommentCommands({ totalCommentCount, rows }: UseCommentCommandsOptions) {
  const queryClient = useQueryClient();

  // ── state reads ─────────────────────────────────────────────

  const hoveredCommentIndex = useTuiStore((s) => s.hoveredCommentIndex);
  const hoveredHelpIndex = useTuiStore((s) => s.hoveredHelpIndex);
  const filter = useTuiStore((s) => s.filter);
  const inputMode = useTuiStore((s) => s.inputMode);
  const showResolved = useTuiStore((s) => s.showResolved);

  // ── setters ─────────────────────────────────────────────────

  const setHoveredCommentIndex = useTuiStore((s) => s.setHoveredCommentIndex);
  const setHoveredHelpIndex = useTuiStore((s) => s.setHoveredHelpIndex);
  const setInputMode = useTuiStore((s) => s.setInputMode);
  const setFilter = useTuiStore((s) => s.setFilter);
  const toggleShowResolved = useTuiStore((s) => s.toggleShowResolved);
  const applyPatch = useTuiStore((s) => s.applyPatch);

  // ── list navigation ─────────────────────────────────────────

  const moveUp = useCallback(() => {
    setHoveredCommentIndex(clampIndex(hoveredCommentIndex - 1, totalCommentCount));
  }, [hoveredCommentIndex, totalCommentCount, setHoveredCommentIndex]);

  const moveDown = useCallback(() => {
    setHoveredCommentIndex(clampIndex(hoveredCommentIndex + 1, totalCommentCount));
  }, [hoveredCommentIndex, totalCommentCount, setHoveredCommentIndex]);

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
      setHoveredHelpIndex(clampIndex(hoveredHelpIndex - 1, totalHelpEntries));
    },
    [hoveredHelpIndex, setHoveredHelpIndex],
  );

  const helpMoveDown = useCallback(
    (totalHelpEntries: number) => {
      setHoveredHelpIndex(clampIndex(hoveredHelpIndex + 1, totalHelpEntries));
    },
    [hoveredHelpIndex, setHoveredHelpIndex],
  );

  const helpActivate = useCallback(
    (actionKey: string) => {
      switch (actionKey) {
        case 'r':
          void queryClient.invalidateQueries({ queryKey: ['comments'] });
          break;
        case 'R':
          toggleShowResolved();
          break;
        case 'e': {
          const row = rows[hoveredCommentIndex];
          if (row) openInEditor(row.file, row.startLine);
          break;
        }
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
    [queryClient, rows, hoveredCommentIndex, toggleShowResolved, setInputMode, applyPatch],
  );

  // ── side effects ────────────────────────────────────────────

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['comments'] });
  }, [queryClient]);

  const editComment = useCallback(() => {
    const row = rows[hoveredCommentIndex];
    if (row) openInEditor(row.file, row.startLine);
  }, [rows, hoveredCommentIndex]);

  const quit = useCallback(() => {
    process.exit(0);
  }, []);

  // ── derived ─────────────────────────────────────────────────

  const hasFilter = filter.length > 0;
  const hasComments = totalCommentCount > 0;

  return {
    // state (read-only by UI)
    inputMode,
    hoveredCommentIndex,
    hoveredHelpIndex,
    filter,
    showResolved,
    hasFilter,
    hasComments,

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
    editComment,
    quit,
  };
}