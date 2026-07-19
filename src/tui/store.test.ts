import { describe, it, expect, beforeEach } from 'vitest';
import { useTuiStore, type TuiState, type TuiKey } from './store.ts';

function fresh(): TuiState {
  return {
    mode: 'normal',
    selectedIndex: 0,
    filter: '',
    filterInput: '',
    showResolved: true,
    popupIndex: 0,
    commentCount: 0,
  };
}

function key(input: string, overrides: Partial<TuiKey> = {}): { input: string; key: TuiKey } {
  return {
    input,
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

function act(a: ReturnType<typeof key>) {
  useTuiStore.getState().handleKey(a.input, a.key);
}

describe('tuiStore', () => {
  beforeEach(() => {
    useTuiStore.setState(fresh());
  });

  describe('initial state', () => {
    it('starts in normal mode', () => {
      expect(useTuiStore.getState().mode).toBe('normal');
    });

    it('starts with selectedIndex 0', () => {
      expect(useTuiStore.getState().selectedIndex).toBe(0);
    });

    it('shows resolved by default', () => {
      expect(useTuiStore.getState().showResolved).toBe(true);
    });
  });

  describe('setCommentCount', () => {
    it('updates commentCount', () => {
      useTuiStore.getState().setCommentCount(5);
      expect(useTuiStore.getState().commentCount).toBe(5);
    });

    it('clamps selectedIndex when count shrinks', () => {
      useTuiStore.setState({ ...fresh(), selectedIndex: 10, commentCount: 20 });
      useTuiStore.getState().setCommentCount(3);
      expect(useTuiStore.getState().selectedIndex).toBe(2);
    });

    it('keeps selectedIndex when count is larger', () => {
      useTuiStore.setState({ ...fresh(), selectedIndex: 3, commentCount: 5 });
      useTuiStore.getState().setCommentCount(10);
      expect(useTuiStore.getState().selectedIndex).toBe(3);
    });
  });

  describe('closeHelp', () => {
    it('closes help and returns to normal', () => {
      useTuiStore.setState({ ...fresh(), mode: 'help' });
      useTuiStore.getState().closeHelp();
      expect(useTuiStore.getState().mode).toBe('normal');
    });

    it('no-ops when not in help mode', () => {
      useTuiStore.setState({ ...fresh(), mode: 'normal' });
      useTuiStore.getState().closeHelp();
      expect(useTuiStore.getState().mode).toBe('normal');
    });
  });

  describe('normal mode — navigation', () => {
    it('j / downArrow moves down', () => {
      useTuiStore.setState({ ...fresh(), commentCount: 5 });
      act(key('j'));
      expect(useTuiStore.getState().selectedIndex).toBe(1);
    });

    it('k / upArrow moves up', () => {
      useTuiStore.setState({ ...fresh(), selectedIndex: 2, commentCount: 5 });
      act(key('k'));
      expect(useTuiStore.getState().selectedIndex).toBe(1);
    });

    it('upArrow clamps at 0', () => {
      act(key('k'));
      expect(useTuiStore.getState().selectedIndex).toBe(0);
    });

    it('downArrow clamps at last item', () => {
      useTuiStore.setState({ ...fresh(), commentCount: 3, selectedIndex: 2 });
      act(key('j'));
      expect(useTuiStore.getState().selectedIndex).toBe(2);
    });
  });

  describe('normal mode — toggles and modes', () => {
    it('R toggles showResolved and resets selectedIndex', () => {
      useTuiStore.setState({ ...fresh(), showResolved: true, selectedIndex: 5, commentCount: 10 });
      act(key('R'));
      expect(useTuiStore.getState().showResolved).toBe(false);
      expect(useTuiStore.getState().selectedIndex).toBe(0);
    });

    it('R toggles back', () => {
      useTuiStore.setState({ ...fresh(), showResolved: false });
      act(key('R'));
      expect(useTuiStore.getState().showResolved).toBe(true);
    });

    it('? does nothing (popup disabled)', () => {
      useTuiStore.setState({ ...fresh(), commentCount: 3 });
      act(key('?'));
      expect(useTuiStore.getState().mode).toBe('normal');
    });

    it('Enter does nothing in normal mode', () => {
      useTuiStore.setState({ ...fresh(), commentCount: 3 });
      act(key('', { return: true }));
      expect(useTuiStore.getState().mode).toBe('normal');
    });

    it('/ enters filter mode', () => {
      act(key('/'));
      expect(useTuiStore.getState().mode).toBe('filter');
    });

    it('/ pre-fills filter input with current filter', () => {
      useTuiStore.setState({ ...fresh(), filter: 'src' });
      act(key('/'));
      expect(useTuiStore.getState().mode).toBe('filter');
      expect(useTuiStore.getState().filterInput).toBe('src');
    });

    it('Esc clears filter and resets selectedIndex', () => {
      useTuiStore.setState({ ...fresh(), filter: 'src', selectedIndex: 3, commentCount: 5 });
      act(key('', { escape: true }));
      expect(useTuiStore.getState().filter).toBe('');
      expect(useTuiStore.getState().selectedIndex).toBe(0);
    });

    it('Esc with no filter does nothing', () => {
      act(key('', { escape: true }));
      expect(useTuiStore.getState().mode).toBe('normal');
    });
  });

  describe('normal mode — side-effect keys (no state change)', () => {
    it('r does not change state', () => {
      const before = useTuiStore.getState();
      act(key('r'));
      expect(useTuiStore.getState()).toEqual(before);
    });

    it('e does not change state', () => {
      const before = useTuiStore.getState();
      act(key('e'));
      expect(useTuiStore.getState()).toEqual(before);
    });

    it('q does not change state', () => {
      const before = useTuiStore.getState();
      act(key('q'));
      expect(useTuiStore.getState()).toEqual(before);
    });
  });

  describe('filter mode', () => {
    it('types characters into filterInput', () => {
      useTuiStore.setState({ ...fresh(), mode: 'filter' });
      act(key('s'));
      act(key('r'));
      act(key('c'));
      expect(useTuiStore.getState().filterInput).toBe('src');
    });

    it('backspace removes last character', () => {
      useTuiStore.setState({ ...fresh(), mode: 'filter', filterInput: 'src' });
      act(key('', { backspace: true }));
      expect(useTuiStore.getState().filterInput).toBe('sr');
    });

    it('Enter applies filter and returns to normal', () => {
      useTuiStore.setState({ ...fresh(), mode: 'filter', filterInput: 'foo' });
      act(key('', { return: true }));
      expect(useTuiStore.getState().mode).toBe('normal');
      expect(useTuiStore.getState().filter).toBe('foo');
      expect(useTuiStore.getState().selectedIndex).toBe(0);
    });

    it('Enter with whitespace trims filter', () => {
      useTuiStore.setState({ ...fresh(), mode: 'filter', filterInput: '  bar  ' });
      act(key('', { return: true }));
      expect(useTuiStore.getState().filter).toBe('bar');
    });

    it('Esc cancels filter and clears input', () => {
      useTuiStore.setState({ ...fresh(), mode: 'filter', filterInput: 'foo' });
      act(key('', { escape: true }));
      expect(useTuiStore.getState().mode).toBe('normal');
      expect(useTuiStore.getState().filterInput).toBe('');
    });

    it('ignores ctrl/meta/tab input', () => {
      useTuiStore.setState({ ...fresh(), mode: 'filter' });
      act(key('x', { ctrl: true }));
      expect(useTuiStore.getState().filterInput).toBe('');
    });
  });

  describe('popup mode (falls through to normal)', () => {
    it('popup keys fall through to normal mode', () => {
      useTuiStore.setState({ ...fresh(), mode: 'popup', commentCount: 3, selectedIndex: 0 });
      act(key('j'));
      expect(useTuiStore.getState().selectedIndex).toBe(1);
      expect(useTuiStore.getState().mode).toBe('popup');
    });
  });
});