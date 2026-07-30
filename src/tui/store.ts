import { create } from 'zustand';
import { loadSettings, saveSettings } from './settings.ts';

// ── types ──────────────────────────────────────────────────────

export type InputMode = 'list' | 'list-filter' | 'help';

export type TuiState = {
  inputMode: InputMode;
  hoveredCommentIndex: number;
  hoveredHelpIndex: number;
  filter: string;
  showResolved: boolean;
  showGitHub: boolean;
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
  setHoveredCommentIndex: (hoveredCommentIndex: number) => void;
  toggleShowResolved: () => void;
  toggleShowGitHub: () => void;
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
  inputMode: 'list',
  hoveredCommentIndex: 0,
  hoveredHelpIndex: 0,
  filter: '',
  showResolved: settings.showResolved,
  showGitHub: settings.showGitHub,
};

// ── store ──────────────────────────────────────────────────────

export const useTuiStore = create<TuiState & TuiActions>((set) => ({
  ...initialState,

  setInputMode: (inputMode) => set({ inputMode }),
  setFilter: (filter) => set({ filter }),
  setHoveredCommentIndex: (hoveredCommentIndex) => set({ hoveredCommentIndex }),
  setHoveredHelpIndex: (hoveredHelpIndex) => set({ hoveredHelpIndex }),
  toggleShowResolved: () => set((s) => ({ showResolved: !s.showResolved, hoveredCommentIndex: 0 })),
  toggleShowGitHub: () => set((s) => ({ showGitHub: !s.showGitHub, hoveredCommentIndex: 0 })),
  applyPatch: (patch) => set(patch),
}));

// ── persistence ────────────────────────────────────────────────

useTuiStore.subscribe((state, prev) => {
  if (state.showResolved !== prev.showResolved) {
    saveSettings({ showResolved: state.showResolved });
  }
  if (state.showGitHub !== prev.showGitHub) {
    saveSettings({ showGitHub: state.showGitHub });
  }
});