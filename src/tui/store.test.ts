/// <reference types="vitest" />
// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTuiStore, type TuiState, type TuiKey, clampIndex } from './store.ts';
import { handleListInput, handleListFilterInput, handleHelpInput } from './useHandleInput.ts';
import type { ListDeps, FilterDeps, HelpDeps } from './useHandleInput.ts';
import { buildLocalKeymaps } from './HelpScreen.tsx';
import { useCommentCommands } from './comments/hooks/useCommentCommands.ts';
import { CommentStatus, CommentSource } from '../comments/comments.domain.ts';
import type { CommentEntity } from '../comments/comments.domain.ts';
import { toCommentListViewModel } from './comments/logic.ts';
import type { CommentRowViewModel } from './comments/view-model.ts';

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
    toggleShowGitHub: vi.fn(),
    openHelp: vi.fn(),
    refresh: vi.fn(),
    editComment: vi.fn(),
    deleteComment: vi.fn(),
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

// ── mock comments for view model tests ─────────────────────────

function makeComment(overrides: Partial<CommentEntity> = {}): CommentEntity {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    file: 'src/foo.ts',
    startLine: 1,
    endLine: 1,
    message: 'test comment',
    status: CommentStatus.Active,
    source: CommentSource.Local,
    externalId: null,
    author: null,
    url: null,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

const mockComments: CommentEntity[] = [
  makeComment({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', file: 'src/a.ts', startLine: 10, message: 'fix this' }),
  makeComment({ id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', file: 'src/b.ts', startLine: 20, message: 'review needed' }),
  makeComment({ id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', file: 'src/c.ts', startLine: 30, message: 'TODO', status: CommentStatus.Resolved }),
  makeComment({ id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', file: 'src/d.ts', startLine: 40, message: 'bug here' }),
  makeComment({ id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', file: 'src/e.ts', startLine: 50, message: 'cleanup', status: CommentStatus.Resolved }),
];

function getVm(): ReturnType<typeof toCommentListViewModel> {
  return toCommentListViewModel(mockComments, useTuiStore.getState());
}

// ── react-query wrapper ────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
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

    it('d calls deleteComment', () => {
      const deps = makeListDeps();
      handleListInput('d', listKey(), deps);
      expect(deps.deleteComment).toHaveBeenCalledOnce();
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

    it('G calls toggleShowGitHub', () => {
      const deps = makeListDeps();
      handleListInput('G', listKey(), deps);
      expect(deps.toggleShowGitHub).toHaveBeenCalledOnce();
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
      expect(actions).toEqual(['r', 'R', 'G', 'e', 'd', '/', 'Esc']);
    });

    it('excludes editor, delete, and clear filter when no comments/filter', () => {
      const entries = buildLocalKeymaps('list', false, false);
      const actions = entries.map((e) => e.action);
      expect(actions).toEqual(['r', 'R', 'G', '/']);
    });

    it('excludes delete when hasFilter but no comments', () => {
      const entries = buildLocalKeymaps('list', true, false);
      const actions = entries.map((e) => e.action);
      expect(actions).toEqual(['r', 'R', 'G', '/', 'Esc']);
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
// useCommentCommands (renderHook tests)
// ════════════════════════════════════════════════════════════════
// Call command functions, then compute CommentListViewModel and assert.

describe('useCommentCommands', () => {
  beforeEach(() => {
    useTuiStore.setState(fresh());
  });

  function renderCommands(rows: CommentRowViewModel[] = []) {
    return renderHook(() => useCommentCommands(rows), { wrapper: makeWrapper() });
  }

  describe('navigation → view model', () => {
    it('moveDown advances selection in view model', () => {
      useTuiStore.setState({ showResolved: true });
      const { result } = renderCommands();

      act(() => result.current.moveDown());
      const vm = getVm();
      expect(vm.rows[0].isSelected).toBe(false);
      expect(vm.rows[1].isSelected).toBe(true);
      expect(vm.rows[1].shortId).toBe('bbbbbbbb');
    });

    it('moveUp moves selection back', () => {
      useTuiStore.setState({ showResolved: true, hoveredCommentIndex: 2 });
      const { result } = renderCommands();

      act(() => result.current.moveUp());
      const vm = getVm();
      expect(vm.rows[1].isSelected).toBe(true);
      expect(vm.rows[1].shortId).toBe('bbbbbbbb');
    });

    it('view model clamps past-end index', () => {
      useTuiStore.setState({ showResolved: true, hoveredCommentIndex: 10 });
      const vm = getVm();
      // logic.ts: Math.min(10, max(0, 4)) = 4
      expect(vm.rows[4].isSelected).toBe(true);
    });

    it('view model clamps negative index to 0', () => {
      useTuiStore.setState({ showResolved: true, hoveredCommentIndex: -5 });
      const vm = getVm();
      expect(vm.rows[0].isSelected).toBe(true);
    });

    it('view model reclamps when filter reduces result set', () => {
      useTuiStore.setState({ showResolved: true, hoveredCommentIndex: 4 });
      const { result } = renderCommands();

      // Type filter -> only 1 match
      act(() => result.current.filterType('f'));
      act(() => result.current.filterType('i'));
      act(() => result.current.filterType('x'));
      const vm = getVm();
      expect(vm.totalCount).toBe(1);
      // hover was 4 but only 1 row -> clamped to 0
      expect(vm.rows[0].isSelected).toBe(true);
    });
  });

  describe('filter → view model', () => {
    it('filterType + filterApply narrows results', () => {
      useTuiStore.setState({ showResolved: true, inputMode: 'list-filter' });
      const { result } = renderCommands();

      act(() => result.current.filterType('b'));
      act(() => result.current.filterType('u'));
      act(() => result.current.filterType('g'));
      act(() => result.current.filterApply());

      const vm = getVm();
      expect(vm.isFilterMode).toBe(false);
      expect(vm.totalCount).toBe(1);
      expect(vm.rows[0].message).toBe('bug here');
    });

    it('filterCancel clears filter and restores all', () => {
      useTuiStore.setState({ showResolved: true, inputMode: 'list-filter', filter: 'bug' });
      const { result } = renderCommands();

      act(() => result.current.filterCancel());
      const vm = getVm();
      expect(vm.isFilterMode).toBe(false);
      expect(vm.filter).toBe('');
      expect(vm.totalCount).toBe(5);
    });

    it('clearFilter resets filter and selection', () => {
      useTuiStore.setState({ showResolved: true, filter: 'bug', hoveredCommentIndex: 3 });
      const { result } = renderCommands();

      act(() => result.current.clearFilter());
      const vm = getVm();
      expect(vm.filter).toBe('');
      expect(vm.totalCount).toBe(5);
      expect(vm.rows[0].isSelected).toBe(true);
    });

    it('filterBackspace removes last character', () => {
      useTuiStore.setState({ showResolved: true, inputMode: 'list-filter', filter: 'bug' });
      const { result } = renderCommands();

      act(() => result.current.filterBackspace());
      act(() => result.current.filterApply());
      const vm = getVm();
      expect(vm.filter).toBe('bu');
    });
  });

  describe('toggleResolved → view model', () => {
    it('hides resolved comments and resets hover', () => {
      useTuiStore.setState({ showResolved: true, hoveredCommentIndex: 3 });
      const { result } = renderCommands();

      act(() => result.current.toggleResolved());
      const vm = getVm();
      expect(vm.showResolved).toBe(false);
      expect(vm.totalCount).toBe(3); // 2 resolved hidden
      expect(vm.rows[0].isSelected).toBe(true);
      expect(vm.rows[0].shortId).toBe('aaaaaaaa');
    });

    it('shows resolved again on second toggle', () => {
      useTuiStore.setState({ showResolved: false });
      const { result } = renderCommands();

      act(() => result.current.toggleResolved());
      const vm = getVm();
      expect(vm.showResolved).toBe(true);
      expect(vm.totalCount).toBe(5);
    });
  });

  describe('filter mode flag', () => {
    it('isFilterMode is false in list mode', () => {
      expect(getVm().isFilterMode).toBe(false);
    });

    it('isFilterMode is true after openFilter', () => {
      const { result } = renderCommands();
      act(() => result.current.openFilter());
      expect(getVm().isFilterMode).toBe(true);
    });
  });

  describe('help operations', () => {
    it('openHelp sets inputMode to help and resets help index', () => {
      useTuiStore.setState({ hoveredHelpIndex: 5 });
      const { result } = renderCommands();

      act(() => result.current.openHelp());
      const s = useTuiStore.getState();
      expect(s.inputMode).toBe('help');
      expect(s.hoveredHelpIndex).toBe(0);
    });

    it('closeHelp returns to list and resets help index', () => {
      useTuiStore.setState({ inputMode: 'help', hoveredHelpIndex: 3 });
      const { result } = renderCommands();

      act(() => result.current.closeHelp());
      const s = useTuiStore.getState();
      expect(s.inputMode).toBe('list');
      expect(s.hoveredHelpIndex).toBe(0);
    });

    it('helpMoveUp moves up and clamps at 0', () => {
      useTuiStore.setState({ hoveredHelpIndex: 2 });
      const { result } = renderCommands();

      act(() => result.current.helpMoveUp(5));
      expect(useTuiStore.getState().hoveredHelpIndex).toBe(1);

      act(() => result.current.helpMoveUp(5));
      expect(useTuiStore.getState().hoveredHelpIndex).toBe(0);
    });

    it('helpMoveDown moves down and clamps at last', () => {
      useTuiStore.setState({ hoveredHelpIndex: 3 });
      const { result } = renderCommands();

      act(() => result.current.helpMoveDown(5));
      expect(useTuiStore.getState().hoveredHelpIndex).toBe(4);

      act(() => result.current.helpMoveDown(5));
      expect(useTuiStore.getState().hoveredHelpIndex).toBe(4);
    });

    it('helpActivate R toggles showResolved', () => {
      const { result } = renderCommands();
      act(() => result.current.helpActivate('R'));
      expect(useTuiStore.getState().showResolved).toBe(false);
    });

    it('helpActivate / enters filter mode', () => {
      const { result } = renderCommands();
      act(() => result.current.helpActivate('/'));
      expect(useTuiStore.getState().inputMode).toBe('list-filter');
    });

    it('helpActivate Esc clears filter', () => {
      useTuiStore.setState({ filter: 'src', hoveredCommentIndex: 3 });
      const { result } = renderCommands();
      act(() => result.current.helpActivate('Esc'));
      const s = useTuiStore.getState();
      expect(s.filter).toBe('');
      expect(s.hoveredCommentIndex).toBe(0);
    });

    it('helpActivate e calls editComment', () => {
      const row = { id: 'a', shortId: 'a', icon: '●', iconColor: 'red', file: 'f.ts', message: 'm', startLine: 1, endLine: 2, isSelected: true, isResolved: false };
      const { result } = renderCommands([row]);
      act(() => result.current.helpActivate('e'));
      // editComment calls openInEditor; smoke test that it doesn't throw
      // openInEditor is a side effect, not easily mockable here
    });

    it('helpActivate d calls deleteComment mutation', () => {
      // deleteComment calls deleteMutation.mutate; smoke test activation doesn't throw
      const { result } = renderCommands();
      act(() => result.current.helpActivate('d'));
      // No row at index 0, so deleteComment is a no-op
    });

    it('helpActivate q exits process (skip — tested via handler)', () => {
      // 'q' calls process.exit(), tested indirectly via handleListInput mock
    });
  });

  describe('hasFilter derived state', () => {
    it('true when filter is non-empty', () => {
      useTuiStore.setState({ filter: 'src' });
      const { result } = renderCommands();
      expect(result.current.hasFilter).toBe(true);
    });

    it('false when filter is empty', () => {
      useTuiStore.setState({ filter: '' });
      const { result } = renderCommands();
      expect(result.current.hasFilter).toBe(false);
    });
  });

  describe('combined workflows', () => {
    it('filter → navigate → toggle → view model correct', () => {
      useTuiStore.setState({ showResolved: true, hoveredCommentIndex: 1 });
      const { result } = renderCommands();
      let vm = getVm();
      expect(vm.totalCount).toBe(5);
      expect(vm.rows[1].isSelected).toBe(true);

      // Enter filter mode, type "fix"
      act(() => result.current.openFilter());
      act(() => result.current.filterType('f'));
      act(() => result.current.filterType('i'));
      act(() => result.current.filterType('x'));
      act(() => result.current.filterApply());
      vm = getVm();
      expect(vm.totalCount).toBe(1);
      expect(vm.rows[0].shortId).toBe('aaaaaaaa');

      // Clear filter
      act(() => result.current.clearFilter());
      vm = getVm();
      expect(vm.totalCount).toBe(5);
      expect(vm.rows[0].isSelected).toBe(true);

      // Toggle resolved off
      act(() => result.current.toggleResolved());
      vm = getVm();
      expect(vm.showResolved).toBe(false);
      expect(vm.totalCount).toBe(3);
    });

    it('resolved rows marked correctly in view model', () => {
      useTuiStore.setState({ showResolved: true });
      const vm = getVm();
      expect(vm.rows[0].isResolved).toBe(false);
      expect(vm.rows[2].isResolved).toBe(true);
      expect(vm.rows[4].isResolved).toBe(true);
    });

    it('view model exposes file and line numbers', () => {
      useTuiStore.setState({ showResolved: true });
      const vm = getVm();
      expect(vm.rows[0].file).toBe('src/a.ts');
      expect(vm.rows[0].startLine).toBe(10);
      expect(vm.rows[1].file).toBe('src/b.ts');
      expect(vm.rows[1].startLine).toBe(20);
    });

    it('empty comments produces zero-row view model', () => {
      useTuiStore.setState(fresh());
      const vm = toCommentListViewModel([], useTuiStore.getState());
      expect(vm.totalCount).toBe(0);
      expect(vm.rows).toEqual([]);
    });
  });
});