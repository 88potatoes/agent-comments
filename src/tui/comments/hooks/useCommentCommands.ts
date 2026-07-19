// ── Comment Commands ────────────────────────────────────────────
// Semantic wrappers around tuiStore.dispatch.
// Components call these instead of dispatching raw key events.

import { useCallback } from 'react';
import { tuiStore } from '../../store.ts';

export function useCommentCommands() {
  const moveUp = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/key', input: 'k', key: {} });
  }, []);

  const moveDown = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/key', input: 'j', key: {} });
  }, []);

  const select = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/setCommentCount', count: tuiStore.getState().commentCount });
  }, []);

  const openFilter = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/key', input: '/', key: {} });
  }, []);

  const openActions = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/key', input: '?', key: {} });
  }, []);

  const closePopup = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/key', input: '', key: { escape: true } });
  }, []);

  const clearFilter = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/key', input: '', key: { escape: true } });
  }, []);

  const toggleResolved = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/key', input: 'R', key: {} });
  }, []);

  const popupMoveUp = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/key', input: 'k', key: {} });
  }, []);

  const popupMoveDown = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/key', input: 'j', key: {} });
  }, []);

  const popupSelect = useCallback(() => {
    // handled externally via key.return in useInput
    tuiStore.dispatch({ type: 'tui/key', input: '', key: { return: true } });
  }, []);

  const filterType = useCallback((char: string) => {
    tuiStore.dispatch({ type: 'tui/key', input: char, key: {} });
  }, []);

  const filterBackspace = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/key', input: '', key: { backspace: true } });
  }, []);

  const filterApply = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/key', input: '', key: { return: true } });
  }, []);

  const filterCancel = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/key', input: '', key: { escape: true } });
  }, []);

  const closeHelp = useCallback(() => {
    tuiStore.dispatch({ type: 'tui/closeHelp' });
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