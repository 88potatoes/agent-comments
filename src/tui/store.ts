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
  commentCount: number;
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

// ── actions (methods on store) ─────────────────────────────────

interface TuiActions {
  setCommentCount: (count: number) => void;
  handleKey: (input: string, key: TuiKey) => void;
  closeHelp: () => void;
}

// ── helpers ────────────────────────────────────────────────────

function clampIndex(idx: number, count: number): number {
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
  commentCount: 0,
};

// ── store ──────────────────────────────────────────────────────

export const useTuiStore = create<TuiState & TuiActions>((set, get) => ({
  ...initialState,

  setCommentCount: (count) =>
    set((s) => ({
      commentCount: count,
      selectedIndex: clampIndex(s.selectedIndex, count),
    })),

  closeHelp: () => {
    if (get().mode === 'help') set({ mode: 'normal' });
  },

  handleKey: (input, key) => {
    const s = get();
    const count = s.commentCount;

    // ── filter mode ──────────────────────────────────────────
    if (s.mode === 'filter') {
      if (key.escape) {
        set({ mode: 'normal', filterInput: '' });
        return;
      }
      if (key.return) {
        set({ filter: s.filterInput.trim(), mode: 'normal', selectedIndex: 0 });
        return;
      }
      if (key.backspace || key.delete) {
        set({ filterInput: s.filterInput.slice(0, -1) });
        return;
      }
      if (input && !key.ctrl && !key.meta && !key.tab) {
        set({ filterInput: s.filterInput + input });
        return;
      }
      return;
    }

    // ── normal mode ──────────────────────────────────────────
    if (key.upArrow || input === 'k') {
      set({ selectedIndex: clampIndex(s.selectedIndex - 1, count) });
      return;
    }
    if (key.downArrow || input === 'j') {
      set({ selectedIndex: clampIndex(s.selectedIndex + 1, count) });
      return;
    }
    if (input === 'R') {
      set({ showResolved: !s.showResolved, selectedIndex: 0 });
      return;
    }
    if (input === '?') {
      return; // popup disabled
    }
    if (input === '/') {
      set({ mode: 'filter', filterInput: s.filter });
      return;
    }
    if (key.escape) {
      if (s.filter) {
        set({ filter: '', selectedIndex: 0 });
      }
      return;
    }
    // r, e, q/Q are side-effect keys handled externally
  },
}));

// ── persistence ────────────────────────────────────────────────

useTuiStore.subscribe((state, prev) => {
  if (state.showResolved !== prev.showResolved) {
    saveSettings({ showResolved: state.showResolved });
  }
});