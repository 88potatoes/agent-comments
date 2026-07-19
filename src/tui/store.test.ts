import { describe, it, expect, beforeEach } from 'vitest';
import { useTuiStore, type TuiState, type TuiKey } from './store.ts';
import { handleListInput, handleListFilterInput, handleHelpInput } from './useHandleInput.ts';

function fresh(): TuiState {
  return {
    inputMode: 'list',
    hoveredCommentIndex: 0,
    filter: '',
    showResolved: true,
  };
}

function key(overrides: Partial<TuiKey> = {}): { input: string; key: TuiKey } {
  return {
    input: '',
    key: {
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
    },
  };
}

const noopVm = { totalCount: 5, rows: [], filter: '', showResolved: true, isFilterMode: false } as any;
const noopComments = [] as any;
const noopQueryClient = { invalidateQueries: () => {} } as any;

describe('handleListInput', () => {
  beforeEach(() => {
    useTuiStore.setState(fresh());
  });

  describe('navigation', () => {
    it('j / downArrow moves down', () => {
      handleListInput('j', key({ downArrow: true }).key, noopVm, noopComments, noopQueryClient);
      expect(useTuiStore.getState().hoveredCommentIndex).toBe(1);
    });

    it('k / upArrow moves up', () => {
      useTuiStore.setState({ hoveredCommentIndex: 2 });
      handleListInput('k', key({ upArrow: true }).key, noopVm, noopComments, noopQueryClient);
      expect(useTuiStore.getState().hoveredCommentIndex).toBe(1);
    });

    it('upArrow clamps at 0', () => {
      handleListInput('k', key({ upArrow: true }).key, { ...noopVm, totalCount: 3 }, noopComments, noopQueryClient);
      expect(useTuiStore.getState().hoveredCommentIndex).toBe(0);
    });

    it('downArrow clamps at last item', () => {
      useTuiStore.setState({ hoveredCommentIndex: 2 });
      handleListInput('j', key({ downArrow: true }).key, { ...noopVm, totalCount: 3 }, noopComments, noopQueryClient);
      expect(useTuiStore.getState().hoveredCommentIndex).toBe(2);
    });

    it('clamps correctly with zero totalCount', () => {
      handleListInput('j', key({ downArrow: true }).key, { ...noopVm, totalCount: 0 }, noopComments, noopQueryClient);
      expect(useTuiStore.getState().hoveredCommentIndex).toBe(0);
    });
  });

  describe('toggles and mode switches', () => {
    it('R toggles showResolved and resets hoveredCommentIndex', () => {
      useTuiStore.setState({ showResolved: true, hoveredCommentIndex: 5 });
      handleListInput('R', key().key, noopVm, noopComments, noopQueryClient);
      const s = useTuiStore.getState();
      expect(s.showResolved).toBe(false);
      expect(s.hoveredCommentIndex).toBe(0);
    });

    it('R toggles back', () => {
      useTuiStore.setState({ showResolved: false });
      handleListInput('R', key().key, noopVm, noopComments, noopQueryClient);
      expect(useTuiStore.getState().showResolved).toBe(true);
    });

    it('/ enters list-filter mode', () => {
      handleListInput('/', key().key, noopVm, noopComments, noopQueryClient);
      expect(useTuiStore.getState().inputMode).toBe('list-filter');
    });

    it('Esc clears filter and resets hoveredCommentIndex', () => {
      useTuiStore.setState({ filter: 'src', hoveredCommentIndex: 3 });
      handleListInput('', key({ escape: true }).key, noopVm, noopComments, noopQueryClient);
      const s = useTuiStore.getState();
      expect(s.filter).toBe('');
      expect(s.hoveredCommentIndex).toBe(0);
    });

    it('Esc with no filter does nothing', () => {
      const before = useTuiStore.getState();
      handleListInput('', key({ escape: true }).key, noopVm, noopComments, noopQueryClient);
      expect(useTuiStore.getState()).toEqual(before);
    });

    it('? enters help mode', () => {
      handleListInput('?', key().key, noopVm, noopComments, noopQueryClient);
      expect(useTuiStore.getState().inputMode).toBe('help');
    });
  });

  describe('side-effect keys (no state change)', () => {
    it('r does not change state', () => {
      const before = useTuiStore.getState();
      handleListInput('r', key().key, noopVm, noopComments, noopQueryClient);
      expect(useTuiStore.getState()).toEqual(before);
    });

    it('e does not change state', () => {
      const before = useTuiStore.getState();
      handleListInput('e', key().key, noopVm, noopComments, noopQueryClient);
      expect(useTuiStore.getState()).toEqual(before);
    });

    it('q exits process (skip in test)', () => {
      // q calls process.exit, just verify it doesn't throw on other keys
      expect(() => handleListInput('w', key().key, noopVm, noopComments, noopQueryClient)).not.toThrow();
    });
  });
});

describe('handleListFilterInput', () => {
  beforeEach(() => {
    useTuiStore.setState({ ...fresh(), inputMode: 'list-filter' });
  });

  it('types characters into filter', () => {
    handleListFilterInput('s', key().key);
    handleListFilterInput('r', key().key);
    handleListFilterInput('c', key().key);
    expect(useTuiStore.getState().filter).toBe('src');
  });

  it('backspace removes last character', () => {
    useTuiStore.setState({ filter: 'src' });
    handleListFilterInput('', key({ backspace: true }).key);
    expect(useTuiStore.getState().filter).toBe('sr');
  });

  it('Enter exits filter mode', () => {
    handleListFilterInput('', key({ return: true }).key);
    const s = useTuiStore.getState();
    expect(s.inputMode).toBe('list');
    expect(s.hoveredCommentIndex).toBe(0);
  });

  it('Esc clears filter and exits', () => {
    useTuiStore.setState({ filter: 'foo' });
    handleListFilterInput('', key({ escape: true }).key);
    const s = useTuiStore.getState();
    expect(s.inputMode).toBe('list');
    expect(s.filter).toBe('');
  });

  it('ignores ctrl/meta/tab input', () => {
    handleListFilterInput('x', key({ ctrl: true }).key);
    expect(useTuiStore.getState().filter).toBe('');
  });
});

describe('handleHelpInput', () => {
  beforeEach(() => {
    useTuiStore.setState({ ...fresh(), inputMode: 'help' });
  });

  it('Esc returns to list mode', () => {
    handleHelpInput('', key({ escape: true }).key);
    expect(useTuiStore.getState().inputMode).toBe('list');
  });

  it('q returns to list mode', () => {
    handleHelpInput('q', key().key);
    expect(useTuiStore.getState().inputMode).toBe('list');
  });

  it('? returns to list mode', () => {
    handleHelpInput('?', key().key);
    expect(useTuiStore.getState().inputMode).toBe('list');
  });

  it('other keys do nothing', () => {
    const before = useTuiStore.getState();
    handleHelpInput('x', key().key);
    expect(useTuiStore.getState()).toEqual(before);
  });
});