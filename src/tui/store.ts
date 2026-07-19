import { createStore } from 'zustand/vanilla';
import { redux } from 'zustand/middleware';
import { loadSettings, saveSettings } from './settings.ts';

// ── state ──────────────────────────────────────────────────────

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

// ── actions ────────────────────────────────────────────────────

export type TuiAction =
  | { type: 'tui/setCommentCount'; count: number }
  | { type: 'tui/key'; input: string; key: TuiKey }
  | { type: 'tui/closeHelp' };

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

// ── pure helpers ───────────────────────────────────────────────

function clampIndex(idx: number, count: number): number {
  return Math.max(0, Math.min(idx, count - 1));
}

function clampPopup(idx: number, max: number): number {
  return Math.max(0, Math.min(idx, max - 1));
}

// ── reducer ────────────────────────────────────────────────────

const tuiReducer = (state: TuiState, action: TuiAction): TuiState => {
  switch (action.type) {
    case 'tui/setCommentCount': {
      return {
        ...state,
        commentCount: action.count,
        selectedIndex: clampIndex(state.selectedIndex, action.count),
      };
    }

    case 'tui/closeHelp': {
      if (state.mode !== 'help') return state;
      return { ...state, mode: 'normal' };
    }

    case 'tui/key': {
      const { input, key } = action;
      const count = state.commentCount;

      // ── popup mode ───────────────────────────────────────────
      if (state.mode === 'popup') {
        if (key.escape || input === 'q') {
          return { ...state, mode: 'normal' };
        }
        if (key.upArrow || input === 'k') {
          return { ...state, popupIndex: clampPopup(state.popupIndex - 1, 99) };
        }
        if (key.downArrow || input === 'j') {
          return { ...state, popupIndex: clampPopup(state.popupIndex + 1, 99) };
        }
        // Enter and direct key presses handled externally (they trigger side effects)
        return state;
      }

      // ── filter mode ──────────────────────────────────────────
      if (state.mode === 'filter') {
        if (key.escape) {
          return { ...state, mode: 'normal', filterInput: '' };
        }
        if (key.return) {
          return {
            ...state,
            filter: state.filterInput.trim(),
            mode: 'normal',
            selectedIndex: 0,
          };
        }
        if (key.backspace || key.delete) {
          return { ...state, filterInput: state.filterInput.slice(0, -1) };
        }
        if (input && !key.ctrl && !key.meta && !key.tab) {
          return { ...state, filterInput: state.filterInput + input };
        }
        return state;
      }

      // ── normal mode ──────────────────────────────────────────
      if (key.upArrow || input === 'k') {
        return { ...state, selectedIndex: clampIndex(state.selectedIndex - 1, count) };
      }
      if (key.downArrow || input === 'j') {
        return { ...state, selectedIndex: clampIndex(state.selectedIndex + 1, count) };
      }
      if (input === 'R') {
        return { ...state, showResolved: !state.showResolved, selectedIndex: 0 };
      }
      if (input === '?') {
        if (count > 0) {
          return { ...state, mode: 'popup', popupIndex: 0 };
        }
        return state;
      }
      if (input === '/') {
        return { ...state, mode: 'filter', filterInput: state.filter };
      }
      if (key.escape) {
        if (state.filter) {
          return { ...state, filter: '', selectedIndex: 0 };
        }
        return state;
      }
      // r, e, q/Q are side-effect keys handled externally
      return state;
    }

    default:
      return state;
  }
};

// ── store ──────────────────────────────────────────────────────

export const tuiStore = createStore(
  redux<TuiState, TuiAction>(tuiReducer, initialState),
);

// persist showResolved to disk whenever it changes
tuiStore.subscribe((state, prev) => {
  if (state.showResolved !== prev.showResolved) {
    saveSettings({ showResolved: state.showResolved });
  }
});