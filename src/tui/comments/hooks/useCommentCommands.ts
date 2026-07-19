// ── Comment Commands ────────────────────────────────────────────
// Semantic wrappers around the TUI store using zustand hooks.

import { useCallback } from 'react';
import { useTuiStore, clampIndex } from '../../store.ts';

export function useCommentCommands(totalCount: number) {
  const selectedIndex = useTuiStore((s) => s.selectedIndex);
  const filter = useTuiStore((s) => s.filter);
  const inputMode = useTuiStore((s) => s.inputMode);
  const setSelectedIndex = useTuiStore((s) => s.setSelectedIndex);
  const setInputMode = useTuiStore((s) => s.setInputMode);
  const setFilter = useTuiStore((s) => s.setFilter);
  const toggleShowResolved = useTuiStore((s) => s.toggleShowResolved);
  const applyPatch = useTuiStore((s) => s.applyPatch);

  const moveUp = useCallback(() => {
    setSelectedIndex(clampIndex(selectedIndex - 1, totalCount));
  }, [selectedIndex, totalCount, setSelectedIndex]);

  const moveDown = useCallback(() => {
    setSelectedIndex(clampIndex(selectedIndex + 1, totalCount));
  }, [selectedIndex, totalCount, setSelectedIndex]);

  const openFilter = useCallback(() => {
    setInputMode('filter');
  }, [setInputMode]);

  const openActions = useCallback(() => {
    // popup disabled
  }, []);

  const closePopup = useCallback(() => {
    setInputMode('normal');
  }, [setInputMode]);

  const clearFilter = useCallback(() => {
    applyPatch({ filter: '', selectedIndex: 0 });
  }, [applyPatch]);

  const toggleResolved = useCallback(() => {
    toggleShowResolved();
  }, [toggleShowResolved]);

  const popupMoveUp = useCallback(() => {
    // popup disabled
  }, []);

  const popupMoveDown = useCallback(() => {
    // popup disabled
  }, []);

  const popupSelect = useCallback(() => {
    // popup disabled
  }, []);

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
    applyPatch({ inputMode: 'normal', selectedIndex: 0 });
  }, [applyPatch]);

  const filterCancel = useCallback(() => {
    applyPatch({ inputMode: 'normal', filter: '' });
  }, [applyPatch]);

  const closeHelp = useCallback(() => {
    if (inputMode === 'help') setInputMode('normal');
  }, [inputMode, setInputMode]);

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