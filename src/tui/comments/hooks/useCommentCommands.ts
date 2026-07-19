// ── Comment Commands ────────────────────────────────────────────
// Semantic wrappers around the TUI store.
// Components call these instead of mutating state directly.

import { useCallback } from 'react';
import { useTuiStore, clampIndex } from '../../store.ts';

export function useCommentCommands(totalCount: number) {
  const moveUp = useCallback(() => {
    const s = useTuiStore.getState();
    useTuiStore.setState({ selectedIndex: clampIndex(s.selectedIndex - 1, totalCount) });
  }, [totalCount]);

  const moveDown = useCallback(() => {
    const s = useTuiStore.getState();
    useTuiStore.setState({ selectedIndex: clampIndex(s.selectedIndex + 1, totalCount) });
  }, [totalCount]);

  const openFilter = useCallback(() => {
    const s = useTuiStore.getState();
    useTuiStore.setState({ mode: 'filter', filterInput: s.filter });
  }, []);

  const openActions = useCallback(() => {
    // popup disabled
  }, []);

  const closePopup = useCallback(() => {
    useTuiStore.setState({ mode: 'normal' });
  }, []);

  const clearFilter = useCallback(() => {
    useTuiStore.setState({ filter: '', selectedIndex: 0 });
  }, []);

  const toggleResolved = useCallback(() => {
    const s = useTuiStore.getState();
    useTuiStore.setState({ showResolved: !s.showResolved, selectedIndex: 0 });
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
    useTuiStore.setState({ filterInput: s.filterInput + char });
  }, []);

  const filterBackspace = useCallback(() => {
    const s = useTuiStore.getState();
    useTuiStore.setState({ filterInput: s.filterInput.slice(0, -1) });
  }, []);

  const filterApply = useCallback(() => {
    const s = useTuiStore.getState();
    useTuiStore.setState({ filter: s.filterInput.trim(), mode: 'normal', selectedIndex: 0 });
  }, []);

  const filterCancel = useCallback(() => {
    useTuiStore.setState({ mode: 'normal', filterInput: '' });
  }, []);

  const closeHelp = useCallback(() => {
    const s = useTuiStore.getState();
    if (s.mode === 'help') useTuiStore.setState({ mode: 'normal' });
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