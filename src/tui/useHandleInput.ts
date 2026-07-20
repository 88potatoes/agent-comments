import { useInput } from 'ink';
import { debug } from './debug.ts';

// ── types ──────────────────────────────────────────────────────

interface UseHandleInputDeps {
  inputMode: string;
  filter: string;
  moveUp: () => void;
  moveDown: () => void;
  openFilter: () => void;
  clearFilter: () => void;
  toggleResolved: () => void;
  filterType: (char: string) => void;
  filterBackspace: () => void;
  filterApply: () => void;
  filterCancel: () => void;
  openHelp: () => void;
  closeHelp: () => void;
  refresh: () => void;
  editComment: () => void;
  deleteComment: () => void;
  quit: () => void;
}

// ── hook ───────────────────────────────────────────────────────

export function useHandleInput(deps: UseHandleInputDeps) {
  const {
    inputMode,
    filter,
    moveUp,
    moveDown,
    openFilter,
    clearFilter,
    toggleResolved,
    filterType,
    filterBackspace,
    filterApply,
    filterCancel,
    openHelp,
    closeHelp,
    refresh,
    editComment,
    deleteComment,
    quit,
  } = deps;

  useInput((input, key) => {
    switch (inputMode) {
      case 'list':
        handleListInput(input, key, {
          filter,
          moveUp,
          moveDown,
          openFilter,
          clearFilter,
          toggleResolved,
          openHelp,
          refresh,
          editComment,
          deleteComment,
          quit,
        });
        break;
      case 'list-filter':
        handleListFilterInput(input, key, {
          filterType,
          filterBackspace,
          filterApply,
          filterCancel,
        });
        break;
      case 'help':
        handleHelpInput(input, key, { closeHelp });
        break;
    }
  });
}

// ── list handler ───────────────────────────────────────────────

export interface ListDeps {
  filter: string;
  moveUp: () => void;
  moveDown: () => void;
  openFilter: () => void;
  clearFilter: () => void;
  toggleResolved: () => void;
  openHelp: () => void;
  refresh: () => void;
  editComment: () => void;
  deleteComment: () => void;
  quit: () => void;
}

export function handleListInput(
  input: string,
  key: { upArrow?: boolean; downArrow?: boolean; escape?: boolean },
  deps: ListDeps,
) {
  debug('input', input);

  // navigation
  if (key.upArrow || input === 'k') {
    deps.moveUp();
    return;
  }
  if (key.downArrow || input === 'j') {
    deps.moveDown();
    return;
  }

  // side effects
  if (input === 'r') {
    deps.refresh();
    return;
  }
  if (input === 'e') {
    deps.editComment();
    return;
  }
  if (input === 'd') {
    deps.deleteComment();
    return;
  }
  if (input === 'q' || input === 'Q') {
    deps.quit();
    return;
  }

  // toggles / mode switches
  if (input === 'R') {
    deps.toggleResolved();
    return;
  }
  if (input === '/') {
    deps.openFilter();
    return;
  }
  if (key.escape && deps.filter) {
    deps.clearFilter();
    return;
  }
  if (input === '?') {
    deps.openHelp();
    return;
  }
}

// ── filter handler ─────────────────────────────────────────────

export interface FilterDeps {
  filterType: (char: string) => void;
  filterBackspace: () => void;
  filterApply: () => void;
  filterCancel: () => void;
}

export function handleListFilterInput(
  input: string,
  key: {
    escape?: boolean;
    return?: boolean;
    backspace?: boolean;
    delete?: boolean;
    ctrl?: boolean;
    meta?: boolean;
    tab?: boolean;
  },
  deps: FilterDeps,
) {
  if (key.escape) {
    deps.filterCancel();
    return;
  }
  if (key.return) {
    deps.filterApply();
    return;
  }
  if (key.backspace || key.delete) {
    deps.filterBackspace();
    return;
  }
  if (input && !key.ctrl && !key.meta && !key.tab) {
    deps.filterType(input);
    return;
  }
}

// ── help handler ───────────────────────────────────────────────

export interface HelpDeps {
  closeHelp: () => void;
}

export function handleHelpInput(
  input: string,
  key: { escape?: boolean },
  deps: HelpDeps,
) {
  if (key.escape || input === 'q' || input === '?') {
    deps.closeHelp();
  }
}