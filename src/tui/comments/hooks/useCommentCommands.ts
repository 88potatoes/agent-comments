// ── Comment Commands ────────────────────────────────────────────
// Semantic wrappers around the TUI store.
// Components call these instead of mutating state directly.

import { useCallback } from 'react';
import { useTuiStore, clampIndex } from '../../store.ts';

export function useCommentCommands(totalCount: number) {
  const moveUp = useCallback(() => {
    const s = useTuiStore.getState();
    useTuiStore.getState().setSelectedIndex(clampIndex(s.selectedIndex - 1, totalCount));
  }, [totalCount]);

  const moveDown = useCallback(() => {
    const s = useTuiStore.getState();
    useTuiStore.getState().setSelectedIndex(clampIndex(s.selectedIndex + 1, totalCount));
  }, [totalCount]);

  const openFilter = useCallback(() => {
    useTuiStore.getState().setInputMode('filter');
  }, []);

  const openActions = useCallback(() => {
    // popup disabled
  }, []);

  const closePopup = useCallback(() => {
    useTuiStore.getState().setInputMode('normal');
  }, []);

  const clearFilter = useCallback(() => {
    const s = useTuiStore.getState();
    s.applyPatch({ filter: '', selectedIndex: 0 });
  }, []);

  const toggleResolved = useCallback(() => {
    useTuiStore.getState().toggleShowResolved();
  }, []);

  const popupMoveUp = useCallback(() => {
    // popup disabled
  }, []);

  const popupMoveDown = useCallback(() => {
    // popup disabled
  }, []);

  const popupSelect = useCallback(() => {
    // popup disabled
  }, []);

  const filterType = useCallback((char: string) => {
    const s = useTuiStore.getState();
    s.setFilter(s.filter + char);
  }, []);

  const filterBackspace = useCallback(() => {
    const s = useTuiStore.getState();
    s.setFilter(s.filter.slice(0, -1));
  }, []);

  const filterApply = useCallback(() => {
    const s = useTuiStore.getState();
    s.applyPatch({ inputMode: 'normal', selectedIndex: 0 });
  }, []);

  const filterCancel = useCallback(() => {
    const s = useTuiStore.getState();
    s.applyPatch({ inputMode: 'normal', filter: '' });
  }, []);

  const closeHelp = useCallback(() => {
    const s = useTuiStore.getState();
    if (s.inputMode === 'help') s.setInputMode('normal');
  }, []);

  return {
    moveUp,
    moveDown,
    openFilter,
    openActions,
    closePopup,
    clearFilter,
    toggleResolved,
    popupMoveUp,
    popupMoveDown,
    popupSelect,
    filterType,
    filterBackspace,
    filterApply,
    filterCancel,
    closeHelp,
  };
}