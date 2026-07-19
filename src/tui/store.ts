import { create } from 'zustand';
import { loadSettings, saveSettings } from './settings.ts';

// ── types ──────────────────────────────────────────────────────

export type TuiMode = 'normal' | 'filter' | 'popup' | 'help';

export type TuiState = {
  mode: TuiMode;
  selectedIndex: number;
  filter: string;
  filterInput: string;
  showResolved: boolean;
  popupIndex: number;
};

export type TuiKey = {
  upArrow?: boolean;
  downArrow?: boolean;
  return?: boolean;
  escape?: boolean;
  backspace?: boolean;
  delete?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  tab?: boolean;
};

// ── helpers ────────────────────────────────────────────────────

export function clampIndex(idx: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(idx, count - 1));
}

// ── initial state ──────────────────────────────────────────────

const settings = loadSettings();

const initialState: TuiState = {
  mode: 'normal',
  selectedIndex: 0,
  filter: '',
  filterInput: '',
  showResolved: settings.showResolved,
  popupIndex: 0,
};

// ── store ──────────────────────────────────────────────────────

export const useTuiStore = create<TuiState>(() => initialState);

// ── persistence ────────────────────────────────────────────────

useTuiStore.subscribe((state, prev) => {
  if (state.showResolved !== prev.showResolved) {
    saveSettings({ showResolved: state.showResolved });
  }
});