import { create } from 'zustand';
import { loadSettings, saveSettings } from './settings.ts';

// ── types ──────────────────────────────────────────────────────

export type InputMode = 'normal' | 'filter' | 'popup' | 'help';

export type TuiState = {
  inputMode: InputMode;
  selectedIndex: number;
  filter: string;
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

// ── actions ────────────────────────────────────────────────────

interface TuiActions {
  setInputMode: (inputMode: InputMode) => void;
  setFilter: (filter: string) => void;
  setSelectedIndex: (selectedIndex: number) => void;
  toggleShowResolved: () => void;
  applyPatch: (patch: Partial<TuiState>) => void;
}

// ── helpers ────────────────────────────────────────────────────

export function clampIndex(idx: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(idx, count - 1));
}

// ── initial state ──────────────────────────────────────────────

const settings = loadSettings();

const initialState: TuiState = {
  inputMode: 'normal',
  selectedIndex: 0,
  filter: '',
  showResolved: settings.showResolved,
  popupIndex: 0,
};

// ── store ──────────────────────────────────────────────────────

export const useTuiStore = create<TuiState & TuiActions>((set) => ({
  ...initialState,

  setInputMode: (inputMode) => set({ inputMode }),
  setFilter: (filter) => set({ filter }),
  setSelectedIndex: (selectedIndex) => set({ selectedIndex }),
  toggleShowResolved: () => set((s) => ({ showResolved: !s.showResolved, selectedIndex: 0 })),
  applyPatch: (patch) => set(patch),
}));

// ── persistence ────────────────────────────────────────────────

useTuiStore.subscribe((state, prev) => {
  if (state.showResolved !== prev.showResolved) {
    saveSettings({ showResolved: state.showResolved });
  }
});