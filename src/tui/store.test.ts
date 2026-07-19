import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTuiStore, type TuiState, type TuiKey, clampIndex } from './store.ts';
import { handleListInput, handleListFilterInput, handleHelpInput } from './useHandleInput.ts';
import type { ListDeps, FilterDeps, HelpDeps } from './useHandleInput.ts';
import { buildLocalKeymaps } from './HelpScreen.tsx';

// ── helpers ────────────────────────────────────────────────────

function fresh(): TuiState {
  return {
    inputMode: 'list',
    hoveredCommentIndex: 0,
    hoveredHelpIndex: 0,
    filter: '',
    showResolved: true,
  };
}

function listKey(overrides: Partial<{ upArrow: boolean; downArrow: boolean; escape: boolean }> = {}) {
  return {
    upArrow: overrides.upArrow ?? false,
    downArrow: overrides.downArrow ?? false,
    escape: overrides.escape ?? false,
  };
}

function filterKey(overrides: Partial<TuiKey> = {}) {
  return {
    upArrow: false,
    downArrow: false,
    return: false,
    escape: false,
    backspace: false,
    delete: false,
    ctrl: false,
    meta: false,
    tab: false,
    ...overrides,
  };
}

function makeListDeps(overrides: Partial<ListDeps> = {}): ListDeps {
  return {
    filter: '',
    moveUp: vi.fn(),
    moveDown: vi.fn(),
    openFilter: vi.fn(),
    clearFilter: vi.fn(),
    toggleResolved: vi.fn(),
    openHelp: vi.fn(),
    refresh: vi.fn(),
    editComment: vi.fn(),
    quit: vi.fn(),
    ...overrides,
  };
}

function makeFilterDeps(overrides: Partial<FilterDeps> = {}): FilterDeps {
  return {
    filterType: vi.fn(),
    filterBackspace: vi.fn(),
    filterApply: vi.fn(),
    filterCancel: vi.fn(),
    ...overrides,
  };
}

function makeHelpDeps(overrides: Partial<HelpDeps> = {}): HelpDeps {
  return {
    closeHelp: vi.fn(),
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════
// handleListInput
// ════════════════════════════════════════════════════════════════

describe('handleListInput', () => {
  describe('navigation', () => {
    it('j calls moveDown', () => {
      const deps = makeListDeps();
      handleListInput('j', listKey({ downArrow: true }), deps);
      expect(deps.moveDown).toHaveBeenCalledOnce();
    });

    it('downArrow calls moveDown', () => {
      const deps = makeListDeps();
      handleListInput('', listKey({ downArrow: true }), deps);
      expect(deps.moveDown).toHaveBeenCalledOnce();
    });

    it('k calls moveUp', () => {
      const deps = makeListDeps();
      handleListInput('k', listKey({ upArrow: true }), deps);
      expect(deps.moveUp).toHaveBeenCalledOnce();
    });

    it('upArrow calls moveUp', () => {
      const deps = makeListDeps();
      handleListInput('', listKey({ upArrow: true }), deps);
      expect(deps.moveUp).toHaveBeenCalledOnce();
    });

    it('navigation takes priority over other keys', () => {
      const deps = makeListDeps();
      handleListInput('r', listKey({ downArrow: true }), deps);
      expect(deps.moveDown).toHaveBeenCalledOnce();
      expect(deps.refresh).not.toHaveBeenCalled();
    });
  });

  describe('side-effect keys', () => {
    it('r calls refresh', () => {
      const deps = makeListDeps();
      handleListInput('r', listKey(), deps);
      expect(deps.refresh).toHaveBeenCalledOnce();
    });

    it('e calls editComment', () => {
      const deps = makeListDeps();
      handleListInput('e', listKey(), deps);
      expect(deps.editComment).toHaveBeenCalledOnce();
    });

    it('q calls quit', () => {
      const deps = makeListDeps();
      handleListInput('q', listKey(), deps);
      expect(deps.quit).toHaveBeenCalledOnce();
    });

    it('Q calls quit', () => {
      const deps = makeListDeps();
      handleListInput('Q', listKey(), deps);
      expect(deps.quit).toHaveBeenCalledOnce();
    });
  });

  describe('toggles and mode switches', () => {
    it('R calls toggleResolved', () => {
      const deps = makeListDeps();
      handleListInput('R', listKey(), deps);
      expect(deps.toggleResolved).toHaveBeenCalledOnce();
    });

    it('/ calls openFilter', () => {
      const deps = makeListDeps();
      handleListInput('/', listKey(), deps);
      expect(deps.openFilter).toHaveBeenCalledOnce();
    });

    it('Esc with filter calls clearFilter', () => {
      const deps = makeListDeps({ filter: 'src' });
      handleListInput('', listKey({ escape: true }), deps);
      expect(deps.clearFilter).toHaveBeenCalledOnce();
    });

    it('Esc with no filter does nothing', () => {
      const deps = makeListDeps({ filter: '' });
      handleListInput('', listKey({ escape: true }), deps);
      expect(deps.clearFilter).not.toHaveBeenCalled();
      expect(deps.moveUp).not.toHaveBeenCalled();
      expect(deps.moveDown).not.toHaveBeenCalled();
      expect(deps.refresh).not.toHaveBeenCalled();
    });

    it('? calls openHelp', () => {
      const deps = makeListDeps();
      handleListInput('?', listKey(), deps);
      expect(deps.openHelp).toHaveBeenCalledOnce();
    });
  });

  describe('unknown keys', () => {
    it('does not call any dep for unknown key', () => {
      const deps = makeListDeps();
      handleListInput('x', listKey(), deps);
      expect(deps.moveUp).not.toHaveBeenCalled();
      expect(deps.moveDown).not.toHaveBeenCalled();
      expect(deps.refresh).not.toHaveBeenCalled();
      expect(deps.editComment).not.toHaveBeenCalled();
    });
  });
});

// ════════════════════════════════════════════════════════════════
// handleListFilterInput
// ════════════════════════════════════════════════════════════════

describe('handleListFilterInput', () => {
  it('types characters via filterType', () => {
    const deps = makeFilterDeps();
    handleListFilterInput('s', filterKey(), deps);
    expect(deps.filterType).toHaveBeenCalledWith('s');
    handleListFilterInput('r', filterKey(), deps);
    expect(deps.filterType).toHaveBeenCalledWith('r');
  });

  it('backspace calls filterBackspace', () => {
    const deps = makeFilterDeps();
    handleListFilterInput('', filterKey({ backspace: true }), deps);
    expect(deps.filterBackspace).toHaveBeenCalledOnce();
  });

  it('delete calls filterBackspace', () => {
    const deps = makeFilterDeps();
    handleListFilterInput('', filterKey({ delete: true }), deps);
    expect(deps.filterBackspace).toHaveBeenCalledOnce();
  });

  it('Enter calls filterApply', () => {
    const deps = makeFilterDeps();
    handleListFilterInput('', filterKey({ return: true }), deps);
    expect(deps.filterApply).toHaveBeenCalledOnce();
  });

  it('Esc calls filterCancel', () => {
    const deps = makeFilterDeps();
    handleListFilterInput('', filterKey({ escape: true }), deps);
    expect(deps.filterCancel).toHaveBeenCalledOnce();
  });

  it('ignores ctrl input', () => {
    const deps = makeFilterDeps();
    handleListFilterInput('x', filterKey({ ctrl: true }), deps);
    expect(deps.filterType).not.toHaveBeenCalled();
  });

  it('ignores meta input', () => {
    const deps = makeFilterDeps();
    handleListFilterInput('x', filterKey({ meta: true }), deps);
    expect(deps.filterType).not.toHaveBeenCalled();
  });

  it('ignores tab input', () => {
    const deps = makeFilterDeps();
    handleListFilterInput('\t', filterKey({ tab: true }), deps);
    expect(deps.filterType).not.toHaveBeenCalled();
  });

  it('empty input does nothing', () => {
    const deps = makeFilterDeps();
    handleListFilterInput('', filterKey(), deps);
    expect(deps.filterType).not.toHaveBeenCalled();
    expect(deps.filterBackspace).not.toHaveBeenCalled();
    expect(deps.filterApply).not.toHaveBeenCalled();
    expect(deps.filterCancel).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// handleHelpInput
// ════════════════════════════════════════════════════════════════

describe('handleHelpInput', () => {
  it('Esc calls closeHelp', () => {
    const deps = makeHelpDeps();
    handleHelpInput('', listKey({ escape: true }), deps);
    expect(deps.closeHelp).toHaveBeenCalledOnce();
  });

  it('q calls closeHelp', () => {
    const deps = makeHelpDeps();
    handleHelpInput('q', listKey(), deps);
    expect(deps.closeHelp).toHaveBeenCalledOnce();
  });

  it('? calls closeHelp', () => {
    const deps = makeHelpDeps();
    handleHelpInput('?', listKey(), deps);
    expect(deps.closeHelp).toHaveBeenCalledOnce();
  });

  it('other keys do nothing', () => {
    const deps = makeHelpDeps();
    handleHelpInput('x', listKey(), deps);
    expect(deps.closeHelp).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// clampIndex
// ════════════════════════════════════════════════════════════════

describe('clampIndex', () => {
  it('returns 0 for empty list', () => {
    expect(clampIndex(5, 0)).toBe(0);
    expect(clampIndex(-1, 0)).toBe(0);
  });

  it('clamps negative to 0', () => {
    expect(clampIndex(-5, 10)).toBe(0);
  });

  it('clamps above max to last index', () => {
    expect(clampIndex(10, 5)).toBe(4);
    expect(clampIndex(5, 5)).toBe(4);
  });

  it('returns valid index unchanged', () => {
    expect(clampIndex(0, 5)).toBe(0);
    expect(clampIndex(2, 5)).toBe(2);
    expect(clampIndex(4, 5)).toBe(4);
  });
});

// ════════════════════════════════════════════════════════════════
// buildLocalKeymaps
// ════════════════════════════════════════════════════════════════

describe('buildLocalKeymaps', () => {
  describe('list mode', () => {
    it('includes refresh and toggle always', () => {
      const entries = buildLocalKeymaps('list', false, false);
      const actions = entries.map((e) => e.action);
      expect(actions).toContain('r');
      expect(actions).toContain('R');
    });

    it('includes filter always', () => {
      const entries = buildLocalKeymaps('list', false, false);
      const actions = entries.map((e) => e.action);
      expect(actions).toContain('/');
    });

    it('includes open in editor when hasComments', () => {
      const withComments = buildLocalKeymaps('list', false, true);
      expect(withComments.map((e) => e.action)).toContain('e');

      const without = buildLocalKeymaps('list', false, false);
      expect(without.map((e) => e.action)).not.toContain('e');
    });

    it('includes clear filter when hasFilter', () => {
      const withFilter = buildLocalKeymaps('list', true, false);
      expect(withFilter.map((e) => e.action)).toContain('Esc');

      const without = buildLocalKeymaps('list', false, false);
      expect(without.map((e) => e.action)).not.toContain('Esc');
    });

    it('includes all actions when has comments and filter', () => {
      const entries = buildLocalKeymaps('list', true, true);
      const actions = entries.map((e) => e.action);
      expect(actions).toEqual(['r', 'R', 'e', '/', 'Esc']);
    });

    it('excludes editor and clear filter when neither applies', () => {
      const entries = buildLocalKeymaps('list', false, false);
      const actions = entries.map((e) => e.action);
      expect(actions).toEqual(['r', 'R', '/']);
    });
  });

  describe('list-filter mode', () => {
    it('has type (no action), Enter, and Esc', () => {
      const entries = buildLocalKeymaps('list-filter', false, false);
      expect(entries).toHaveLength(3);
      expect(entries[0].keys).toBe('type');
      expect(entries[0].action).toBeUndefined();
      expect(entries[1].keys).toBe('Enter');
      expect(entries[1].action).toBe('Enter');
      expect(entries[2].keys).toBe('Esc');
      expect(entries[2].action).toBe('Esc');
    });
  });

  describe('help mode', () => {
    it('returns empty array', () => {
      expect(buildLocalKeymaps('help', false, false)).toEqual([]);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// useCommentCommands — integration via store
// ════════════════════════════════════════════════════════════════

describe('useCommentCommands (store integration)', () => {
  beforeEach(() => {
    useTuiStore.setState(fresh());
  });

  // We test the command logic by directly calling store actions that
  // mirror what useCommentCommands does (since we can't render the hook
  // without @testing-library/react).

  describe('openHelp', () => {
    it('sets inputMode to help and resets hoveredHelpIndex', () => {
      useTuiStore.setState({ hoveredHelpIndex: 5 });
      const s = useTuiStore.getState();
      s.applyPatch({ inputMode: 'help', hoveredHelpIndex: 0 });
      const next = useTuiStore.getState();
      expect(next.inputMode).toBe('help');
      expect(next.hoveredHelpIndex).toBe(0);
    });
  });

  describe('closeHelp', () => {
    it('sets inputMode to list and resets hoveredHelpIndex', () => {
      useTuiStore.setState({ inputMode: 'help', hoveredHelpIndex: 3 });
      const s = useTuiStore.getState();
      s.applyPatch({ inputMode: 'list', hoveredHelpIndex: 0 });
      const next = useTuiStore.getState();
      expect(next.inputMode).toBe('list');
      expect(next.hoveredHelpIndex).toBe(0);
    });
  });

  describe('helpMoveUp', () => {
    it('moves hoveredHelpIndex up and clamps at 0', () => {
      useTuiStore.setState({ hoveredHelpIndex: 2 });
      const s = useTuiStore.getState();
      s.setHoveredHelpIndex(clampIndex(s.hoveredHelpIndex - 1, 5));
      expect(useTuiStore.getState().hoveredHelpIndex).toBe(1);

      useTuiStore.setState({ hoveredHelpIndex: 0 });
      s.setHoveredHelpIndex(clampIndex(useTuiStore.getState().hoveredHelpIndex - 1, 5));
      expect(useTuiStore.getState().hoveredHelpIndex).toBe(0);
    });
  });

  describe('helpMoveDown', () => {
    it('moves hoveredHelpIndex down and clamps at last', () => {
      useTuiStore.setState({ hoveredHelpIndex: 0 });
      const s = useTuiStore.getState();
      s.setHoveredHelpIndex(clampIndex(s.hoveredHelpIndex + 1, 5));
      expect(useTuiStore.getState().hoveredHelpIndex).toBe(1);

      useTuiStore.setState({ hoveredHelpIndex: 4 });
      s.setHoveredHelpIndex(clampIndex(useTuiStore.getState().hoveredHelpIndex + 1, 5));
      expect(useTuiStore.getState().hoveredHelpIndex).toBe(4);
    });

    it('clamps correctly with 0 total entries', () => {
      useTuiStore.setState({ hoveredHelpIndex: 0 });
      const s = useTuiStore.getState();
      s.setHoveredHelpIndex(clampIndex(s.hoveredHelpIndex + 1, 0));
      expect(useTuiStore.getState().hoveredHelpIndex).toBe(0);
    });
  });

  describe('helpActivate', () => {
    it('toggles showResolved on R action', () => {
      useTuiStore.getState().toggleShowResolved();
      expect(useTuiStore.getState().showResolved).toBe(false);
    });

    it('sets inputMode to list-filter on / action', () => {
      useTuiStore.getState().setInputMode('list-filter');
      expect(useTuiStore.getState().inputMode).toBe('list-filter');
    });

    it('clears filter on Esc action', () => {
      useTuiStore.setState({ filter: 'src', hoveredCommentIndex: 3 });
      useTuiStore.getState().applyPatch({ filter: '', hoveredCommentIndex: 0 });
      const s = useTuiStore.getState();
      expect(s.filter).toBe('');
      expect(s.hoveredCommentIndex).toBe(0);
    });

    it('applies filter on Enter action', () => {
      useTuiStore.setState({ inputMode: 'list-filter', hoveredCommentIndex: 3 });
      useTuiStore.getState().applyPatch({ inputMode: 'list', hoveredCommentIndex: 0 });
      const s = useTuiStore.getState();
      expect(s.inputMode).toBe('list');
      expect(s.hoveredCommentIndex).toBe(0);
    });
  });

  describe('moveUp / moveDown (comment navigation)', () => {
    it('moveDown increases hoveredCommentIndex', () => {
      const s = useTuiStore.getState();
      s.setHoveredCommentIndex(clampIndex(s.hoveredCommentIndex + 1, 5));
      expect(useTuiStore.getState().hoveredCommentIndex).toBe(1);
    });

    it('moveUp decreases hoveredCommentIndex', () => {
      useTuiStore.setState({ hoveredCommentIndex: 3 });
      const s = useTuiStore.getState();
      s.setHoveredCommentIndex(clampIndex(s.hoveredCommentIndex - 1, 5));
      expect(useTuiStore.getState().hoveredCommentIndex).toBe(2);
    });

    it('moveDown clamps at last', () => {
      useTuiStore.setState({ hoveredCommentIndex: 4 });
      const s = useTuiStore.getState();
      s.setHoveredCommentIndex(clampIndex(s.hoveredCommentIndex + 1, 5));
      expect(useTuiStore.getState().hoveredCommentIndex).toBe(4);
    });

    it('moveUp clamps at 0', () => {
      useTuiStore.setState({ hoveredCommentIndex: 0 });
      const s = useTuiStore.getState();
      s.setHoveredCommentIndex(clampIndex(s.hoveredCommentIndex - 1, 5));
      expect(useTuiStore.getState().hoveredCommentIndex).toBe(0);
    });

    it('clamps correctly with zero totalCount', () => {
      useTuiStore.setState({ hoveredCommentIndex: 0 });
      const s = useTuiStore.getState();
      s.setHoveredCommentIndex(clampIndex(s.hoveredCommentIndex + 1, 0));
      expect(useTuiStore.getState().hoveredCommentIndex).toBe(0);
    });
  });

  describe('filter operations', () => {
    it('filterType appends characters', () => {
      useTuiStore.getState().setFilter('s');
      useTuiStore.getState().setFilter('sr');
      useTuiStore.getState().setFilter('src');
      expect(useTuiStore.getState().filter).toBe('src');
    });

    it('filterBackspace removes last character', () => {
      useTuiStore.setState({ filter: 'src' });
      const s = useTuiStore.getState();
      s.setFilter(s.filter.slice(0, -1));
      expect(useTuiStore.getState().filter).toBe('sr');
    });

    it('clearFilter resets filter and hover index', () => {
      useTuiStore.setState({ filter: 'src', hoveredCommentIndex: 5 });
      useTuiStore.getState().applyPatch({ filter: '', hoveredCommentIndex: 0 });
      const s = useTuiStore.getState();
      expect(s.filter).toBe('');
      expect(s.hoveredCommentIndex).toBe(0);
    });

    it('filterApply exits filter mode and resets hover', () => {
      useTuiStore.setState({ inputMode: 'list-filter', hoveredCommentIndex: 3 });
      useTuiStore.getState().applyPatch({ inputMode: 'list', hoveredCommentIndex: 0 });
      const s = useTuiStore.getState();
      expect(s.inputMode).toBe('list');
      expect(s.hoveredCommentIndex).toBe(0);
    });

    it('filterCancel exits filter mode and clears filter', () => {
      useTuiStore.setState({ inputMode: 'list-filter', filter: 'src' });
      useTuiStore.getState().applyPatch({ inputMode: 'list', filter: '' });
      const s = useTuiStore.getState();
      expect(s.inputMode).toBe('list');
      expect(s.filter).toBe('');
    });

    it('openFilter sets inputMode to list-filter', () => {
      useTuiStore.getState().setInputMode('list-filter');
      expect(useTuiStore.getState().inputMode).toBe('list-filter');
    });
  });

  describe('toggleResolved', () => {
    it('toggles showResolved and resets hoveredCommentIndex', () => {
      useTuiStore.setState({ showResolved: true, hoveredCommentIndex: 5 });
      useTuiStore.getState().toggleShowResolved();
      const s = useTuiStore.getState();
      expect(s.showResolved).toBe(false);
      expect(s.hoveredCommentIndex).toBe(0);
    });

    it('toggles back', () => {
      useTuiStore.setState({ showResolved: false, hoveredCommentIndex: 0 });
      useTuiStore.getState().toggleShowResolved();
      expect(useTuiStore.getState().showResolved).toBe(true);
    });
  });

  describe('hasFilter / hasComments', () => {
    it('hasFilter is true when filter is non-empty', () => {
      useTuiStore.setState({ filter: 'src' });
      expect(useTuiStore.getState().filter.length > 0).toBe(true);
    });

    it('hasFilter is false when filter is empty', () => {
      useTuiStore.setState({ filter: '' });
      expect(useTuiStore.getState().filter.length > 0).toBe(false);
    });
  });

  describe('combined operations', () => {
    it('entering and exiting filter mode preserves other state', () => {
      useTuiStore.setState({ filter: '', hoveredCommentIndex: 2 });
      // Enter filter
      useTuiStore.getState().setInputMode('list-filter');
      expect(useTuiStore.getState().inputMode).toBe('list-filter');
      // Type
      useTuiStore.getState().setFilter('a');
      // Apply
      useTuiStore.getState().applyPatch({ inputMode: 'list', hoveredCommentIndex: 0 });
      const s = useTuiStore.getState();
      expect(s.inputMode).toBe('list');
      expect(s.filter).toBe('a');
      expect(s.hoveredCommentIndex).toBe(0);
    });

    it('opening help, navigating, and closing resets help index', () => {
      // Open help
      useTuiStore.getState().applyPatch({ inputMode: 'help', hoveredHelpIndex: 0 });
      expect(useTuiStore.getState().inputMode).toBe('help');
      expect(useTuiStore.getState().hoveredHelpIndex).toBe(0);

      // Navigate down
      useTuiStore.getState().setHoveredHelpIndex(2);
      expect(useTuiStore.getState().hoveredHelpIndex).toBe(2);

      // Close help
      useTuiStore.getState().applyPatch({ inputMode: 'list', hoveredHelpIndex: 0 });
      expect(useTuiStore.getState().inputMode).toBe('list');
      expect(useTuiStore.getState().hoveredHelpIndex).toBe(0);
    });

    it('opening help from filter mode with active filter works', () => {
      useTuiStore.setState({
        inputMode: 'list-filter',
        filter: 'src',
        hoveredCommentIndex: 3,
        hoveredHelpIndex: 99,
      });

      // Open help (this is what openHelp does — applyPatch resets multiple fields)
      useTuiStore.getState().applyPatch({ inputMode: 'help', hoveredHelpIndex: 0 });

      const s = useTuiStore.getState();
      expect(s.inputMode).toBe('help');
      expect(s.hoveredHelpIndex).toBe(0);
      // Other state preserved
      expect(s.filter).toBe('src');
      expect(s.hoveredCommentIndex).toBe(3);
    });
  });
});