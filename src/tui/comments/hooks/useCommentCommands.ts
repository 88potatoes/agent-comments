// ── Comment Commands ────────────────────────────────────────────
// Semantic wrappers around the TUI store using zustand hooks.

import { useCallback } from 'react';
import { useTuiStore, clampIndex } from '../../store.ts';

export function useCommentCommands(totalCount: number) {
  const hoveredCommentIndex = useTuiStore((s) => s.hoveredCommentIndex);
  const filter = useTuiStore((s) => s.filter);
  const inputMode = useTuiStore((s) => s.inputMode);
  const setHoveredCommentIndex = useTuiStore((s) => s.setHoveredCommentIndex);
  const setInputMode = useTuiStore((s) => s.setInputMode);
  const setFilter = useTuiStore((s) => s.setFilter);
  const toggleShowResolved = useTuiStore((s) => s.toggleShowResolved);
  const applyPatch = useTuiStore((s) => s.applyPatch);

  const moveUp = useCallback(() => {
    setHoveredCommentIndex(clampIndex(hoveredCommentIndex - 1, totalCount));
  }, [hoveredCommentIndex, totalCount, setHoveredCommentIndex]);

  const moveDown = useCallback(() => {
    setHoveredCommentIndex(clampIndex(hoveredCommentIndex + 1, totalCount));
  }, [hoveredCommentIndex, totalCount, setHoveredCommentIndex]);

  const openFilter = useCallback(() => {
    setInputMode('list-filter');
  }, [setInputMode]);

  const clearFilter = useCallback(() => {
    applyPatch({ filter: '', hoveredCommentIndex: 0 });
  }, [applyPatch]);

  const toggleResolved = useCallback(() => {
    toggleShowResolved();
  }, [toggleShowResolved]);

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

  const closeHelp = useCallback(() => {
    if (inputMode === 'help') setInputMode('list');
  }, [inputMode, setInputMode]);

  return {
    moveUp,
    moveDown,
    openFilter,
    clearFilter,
    toggleResolved,
    filterType,
    filterBackspace,
    filterApply,
    filterCancel,
    closeHelp,
  };
}