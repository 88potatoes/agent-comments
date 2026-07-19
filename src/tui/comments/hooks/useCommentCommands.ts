// ── Comment Commands ────────────────────────────────────────────
// Semantic wrappers around the TUI store.
// Components call these instead of dispatching raw key events.

import { useCallback } from 'react';
import { useTuiStore } from '../../store.ts';

export function useCommentCommands() {
  const moveUp = useCallback(() => {
    useTuiStore.getState().handleKey('k', {});
  }, []);

  const moveDown = useCallback(() => {
    useTuiStore.getState().handleKey('j', {});
  }, []);

  const select = useCallback(() => {
    const s = useTuiStore.getState();
    s.setCommentCount(s.commentCount);
  }, []);

  const openFilter = useCallback(() => {
    useTuiStore.getState().handleKey('/', {});
  }, []);

  const openActions = useCallback(() => {
    useTuiStore.getState().handleKey('?', {});
  }, []);

  const closePopup = useCallback(() => {
    useTuiStore.getState().handleKey('', { escape: true });
  }, []);

  const clearFilter = useCallback(() => {
    useTuiStore.getState().handleKey('', { escape: true });
  }, []);

  const toggleResolved = useCallback(() => {
    useTuiStore.getState().handleKey('R', {});
  }, []);

  const popupMoveUp = useCallback(() => {
    useTuiStore.getState().handleKey('k', {});
  }, []);

  const popupMoveDown = useCallback(() => {
    useTuiStore.getState().handleKey('j', {});
  }, []);

  const popupSelect = useCallback(() => {
    useTuiStore.getState().handleKey('', { return: true });
  }, []);

  const filterType = useCallback((char: string) => {
    useTuiStore.getState().handleKey(char, {});
  }, []);

  const filterBackspace = useCallback(() => {
    useTuiStore.getState().handleKey('', { backspace: true });
  }, []);

  const filterApply = useCallback(() => {
    useTuiStore.getState().handleKey('', { return: true });
  }, []);

  const filterCancel = useCallback(() => {
    useTuiStore.getState().handleKey('', { escape: true });
  }, []);

  const closeHelp = useCallback(() => {
    useTuiStore.getState().closeHelp();
  }, []);

  return {
    moveUp,
    moveDown,
    select,
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