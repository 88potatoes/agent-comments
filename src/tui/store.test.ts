import { describe, it, expect, beforeEach } from 'vitest';
import { tuiStore, type TuiState } from './store.ts';

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

function key(input: string, overrides: Record<string, boolean> = {}) {
  return {
    type: 'tui/key' as const,
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

// Helper to reduce an action from a given state
describe('tuiStore', () => {
  beforeEach(() => {
    tuiStore.setState(fresh());
  });

  describe('initial state', () => {
    it('starts in normal mode', () => {
      expect(tuiStore.getState().mode).toBe('normal');
    });

    it('starts with selectedIndex 0', () => {
      expect(tuiStore.getState().selectedIndex).toBe(0);
    });

    it('shows resolved by default', () => {
      expect(tuiStore.getState().showResolved).toBe(true);
    });
  });

  describe('tui/setCommentCount', () => {
    it('updates commentCount', () => {
      tuiStore.dispatch({ type: 'tui/setCommentCount', count: 5 });
      expect(tuiStore.getState().commentCount).toBe(5);
    });

    it('clamps selectedIndex when count shrinks', () => {
      tuiStore.setState({ ...fresh(), selectedIndex: 10, commentCount: 20 });
      tuiStore.dispatch({ type: 'tui/setCommentCount', count: 3 });
      expect(tuiStore.getState().selectedIndex).toBe(2);
    });

    it('keeps selectedIndex when count is larger', () => {
      tuiStore.setState({ ...fresh(), selectedIndex: 3, commentCount: 5 });
      tuiStore.dispatch({ type: 'tui/setCommentCount', count: 10 });
      expect(tuiStore.getState().selectedIndex).toBe(3);
    });
  });

  describe('tui/closeHelp', () => {
    it('closes help and returns to normal', () => {
      tuiStore.setState({ ...fresh(), mode: 'help' });
      tuiStore.dispatch({ type: 'tui/closeHelp' });
      expect(tuiStore.getState().mode).toBe('normal');
    });

    it('no-ops when not in help mode', () => {
      tuiStore.setState({ ...fresh(), mode: 'normal' });
      tuiStore.dispatch({ type: 'tui/closeHelp' });
      expect(tuiStore.getState().mode).toBe('normal');
    });
  });

  describe('normal mode — navigation', () => {
    it('j / downArrow moves down', () => {
      const s = { ...fresh(), commentCount: 5 };
      tuiStore.setState(s);
      tuiStore.dispatch(key('j'));
      expect(tuiStore.getState().selectedIndex).toBe(1);
    });

    it('k / upArrow moves up', () => {
      const s = { ...fresh(), selectedIndex: 2, commentCount: 5 };
      tuiStore.setState(s);
      tuiStore.dispatch(key('k'));
      expect(tuiStore.getState().selectedIndex).toBe(1);
    });

    it('upArrow clamps at 0', () => {
      tuiStore.dispatch(key('k'));
      expect(tuiStore.getState().selectedIndex).toBe(0);
    });

    it('downArrow clamps at last item', () => {
      const s = { ...fresh(), commentCount: 3, selectedIndex: 2 };
      tuiStore.setState(s);
      tuiStore.dispatch(key('j'));
      expect(tuiStore.getState().selectedIndex).toBe(2);
    });
  });

  describe('normal mode — toggles and modes', () => {
    it('R toggles showResolved and resets selectedIndex', () => {
      const s = { ...fresh(), showResolved: true, selectedIndex: 5, commentCount: 10 };
      tuiStore.setState(s);
      tuiStore.dispatch(key('R'));
      expect(tuiStore.getState().showResolved).toBe(false);
      expect(tuiStore.getState().selectedIndex).toBe(0);
    });

    it('R toggles back', () => {
      const s = { ...fresh(), showResolved: false };
      tuiStore.setState(s);
      tuiStore.dispatch(key('R'));
      expect(tuiStore.getState().showResolved).toBe(true);
    });

    it('? does nothing (popup disabled)', () => {
      const s = { ...fresh(), commentCount: 3 };
      tuiStore.setState(s);
      tuiStore.dispatch(key('?'));
      expect(tuiStore.getState().mode).toBe('normal');
    });

    it('Enter does nothing in normal mode', () => {
      const s = { ...fresh(), commentCount: 3 };
      tuiStore.setState(s);
      tuiStore.dispatch(key('', { return: true }));
      expect(tuiStore.getState().mode).toBe('normal');
    });

    it('/ (pre-fills filter)', () => {
      tuiStore.dispatch(key('/'));
      expect(tuiStore.getState().mode).toBe('filter');
    });

    it('/ pre-fills filter input with current filter', () => {
      const s = { ...fresh(), filter: 'src' };
      tuiStore.setState(s);
      tuiStore.dispatch(key('/'));
      expect(tuiStore.getState().mode).toBe('filter');
      expect(tuiStore.getState().filterInput).toBe('src');
    });

    it('Esc clears filter and resets selectedIndex', () => {
      const s = { ...fresh(), filter: 'src', selectedIndex: 3, commentCount: 5 };
      tuiStore.setState(s);
      tuiStore.dispatch(key('', { escape: true }));
      expect(tuiStore.getState().filter).toBe('');
      expect(tuiStore.getState().selectedIndex).toBe(0);
    });

    it('Esc with no filter does nothing', () => {
      tuiStore.dispatch(key('', { escape: true }));
      expect(tuiStore.getState().mode).toBe('normal');
    });
  });

  describe('normal mode — side-effect keys (no state change)', () => {
    it('r does not change state', () => {
      const before = tuiStore.getState();
      tuiStore.dispatch(key('r'));
      expect(tuiStore.getState()).toEqual(before);
    });

    it('e does not change state', () => {
      const before = tuiStore.getState();
      tuiStore.dispatch(key('e'));
      expect(tuiStore.getState()).toEqual(before);
    });

    it('q does not change state', () => {
      const before = tuiStore.getState();
      tuiStore.dispatch(key('q'));
      expect(tuiStore.getState()).toEqual(before);
    });
  });

  describe('filter mode', () => {
    it('types characters into filterInput', () => {
      const s = { ...fresh(), mode: 'filter' as const };
      tuiStore.setState(s);
      tuiStore.dispatch(key('s'));
      tuiStore.dispatch(key('r'));
      tuiStore.dispatch(key('c'));
      expect(tuiStore.getState().filterInput).toBe('src');
    });

    it('backspace removes last character', () => {
      const s = { ...fresh(), mode: 'filter' as const, filterInput: 'src' };
      tuiStore.setState(s);
      tuiStore.dispatch(key('', { backspace: true }));
      expect(tuiStore.getState().filterInput).toBe('sr');
    });

    it('Enter applies filter and returns to normal', () => {
      const s = { ...fresh(), mode: 'filter' as const, filterInput: 'foo' };
      tuiStore.setState(s);
      tuiStore.dispatch(key('', { return: true }));
      expect(tuiStore.getState().mode).toBe('normal');
      expect(tuiStore.getState().filter).toBe('foo');
      expect(tuiStore.getState().selectedIndex).toBe(0);
    });

    it('Enter with whitespace trims filter', () => {
      const s = { ...fresh(), mode: 'filter' as const, filterInput: '  bar  ' };
      tuiStore.setState(s);
      tuiStore.dispatch(key('', { return: true }));
      expect(tuiStore.getState().filter).toBe('bar');
    });

    it('Esc cancels filter and clears input', () => {
      const s = { ...fresh(), mode: 'filter' as const, filterInput: 'foo' };
      tuiStore.setState(s);
      tuiStore.dispatch(key('', { escape: true }));
      expect(tuiStore.getState().mode).toBe('normal');
      expect(tuiStore.getState().filterInput).toBe('');
    });

    it('ignores ctrl/meta/tab input', () => {
      const s = { ...fresh(), mode: 'filter' as const };
      tuiStore.setState(s);
      tuiStore.dispatch({ type: 'tui/key', input: 'x', key: { ctrl: true } });
      expect(tuiStore.getState().filterInput).toBe('');
    });
  });

  describe('popup mode (disabled for now)', () => {
    it('popup keys fall through to normal mode', () => {
      const s = { ...fresh(), mode: 'popup' as const, commentCount: 3, selectedIndex: 0 };
      tuiStore.setState(s);
      tuiStore.dispatch(key('j'));
      // falls through to normal mode j → selectedIndex + 1
      expect(tuiStore.getState().selectedIndex).toBe(1);
      expect(tuiStore.getState().mode).toBe('popup');
    });
  });

});