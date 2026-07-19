import { useSyncExternalStore } from 'react';
import { tuiStore, type TuiState, type TuiAction } from './store.ts';

export function useTuiStore(): TuiState {
  return useSyncExternalStore(
    (cb) => tuiStore.subscribe(cb),
    () => tuiStore.getState(),
  );
}

export function useTuiDispatch() {
  return (action: TuiAction) => tuiStore.dispatch(action);
}