import { describe, it, expect } from 'vitest';
import { type TuiState, type TuiKey } from './store.ts';
import { reduceKey } from './useHandleInput.ts';

function fresh(): TuiState {
  return {
    inputMode: 'normal',
    hoveredCommentIndex: 0,
    filter: '',
    showResolved: true,
    popupIndex: 0,
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

function act(state: TuiState, a: ReturnType<typeof key>, totalCount = 5): Partial<TuiState> | null {
  return reduceKey(state, a.input, a.key, totalCount);
}

describe('reduceKey', () => {
  describe('normal mode — navigation', () => {
    it('j / downArrow moves down', () => {
      const patch = act(fresh(), key('j'), 5);
      expect(patch).toEqual({ hoveredCommentIndex: 1 });
    });

    it('k / upArrow moves up', () => {
      const s = { ...fresh(), hoveredCommentIndex: 2 };
      const patch = act(s, key('k'), 5);
      expect(patch).toEqual({ hoveredCommentIndex: 1 });
    });

    it('upArrow clamps at 0', () => {
      const patch = act(fresh(), key('k'), 3);
      expect(patch).toEqual({ hoveredCommentIndex: 0 });
    });

    it('downArrow clamps at last item', () => {
      const s = { ...fresh(), hoveredCommentIndex: 2 };
      const patch = act(s, key('j'), 3);
      expect(patch).toEqual({ hoveredCommentIndex: 2 });
    });

    it('clamps correctly with zero totalCount', () => {
      const patch = act(fresh(), key('j'), 0);
      expect(patch).toEqual({ hoveredCommentIndex: 0 });
    });
  });

  describe('normal mode — toggles and modes', () => {
    it('R toggles showResolved and resets hoveredCommentIndex', () => {
      const s = { ...fresh(), showResolved: true, hoveredCommentIndex: 5 };
      const patch = act(s, key('R'), 10);
      expect(patch).toEqual({ showResolved: false, hoveredCommentIndex: 0 });
    });

    it('R toggles back', () => {
      const s = { ...fresh(), showResolved: false };
      const patch = act(s, key('R'));
      expect(patch).toEqual({ showResolved: true, hoveredCommentIndex: 0 });
    });

    it('? returns null (popup disabled)', () => {
      const patch = act(fresh(), key('?'), 3);
      expect(patch).toBeNull();
    });

    it('Enter returns null in normal mode', () => {
      const patch = act(fresh(), key('', { return: true }), 3);
      expect(patch).toBeNull();
    });

    it('/ enters filter mode', () => {
      const patch = act(fresh(), key('/'));
      expect(patch).toEqual({ inputMode: 'filter' });
    });

    it('/ enters filter mode preserving current filter', () => {
      const s = { ...fresh(), filter: 'src' };
      const patch = act(s, key('/'));
      expect(patch).toEqual({ inputMode: 'filter' });
    });

    it('Esc clears filter and resets hoveredCommentIndex', () => {
      const s = { ...fresh(), filter: 'src', hoveredCommentIndex: 3 };
      const patch = act(s, key('', { escape: true }), 5);
      expect(patch).toEqual({ filter: '', hoveredCommentIndex: 0 });
    });

    it('Esc with no filter returns null', () => {
      const patch = act(fresh(), key('', { escape: true }));
      expect(patch).toBeNull();
    });
  });

  describe('normal mode — side-effect keys (no state change)', () => {
    it('r returns null', () => {
      expect(act(fresh(), key('r'))).toBeNull();
    });

    it('e returns null', () => {
      expect(act(fresh(), key('e'))).toBeNull();
    });

    it('q returns null', () => {
      expect(act(fresh(), key('q'))).toBeNull();
    });
  });

  describe('filter mode', () => {
    it('types characters into filter', () => {
      const s = { ...fresh(), inputMode: 'filter' as const };
      expect(reduceKey(s, 's', key('s').key, 0)).toEqual({ filter: 's' });
      s.filter = 's';
      expect(reduceKey(s, 'r', key('r').key, 0)).toEqual({ filter: 'sr' });
      s.filter = 'sr';
      expect(reduceKey(s, 'c', key('c').key, 0)).toEqual({ filter: 'src' });
    });

    it('backspace removes last character', () => {
      const s = { ...fresh(), inputMode: 'filter' as const, filter: 'src' };
      const patch = reduceKey(s, '', key('', { backspace: true }).key, 0);
      expect(patch).toEqual({ filter: 'sr' });
    });

    it('Enter exits filter mode (filter already applied live)', () => {
      const s = { ...fresh(), inputMode: 'filter' as const, filter: 'foo' };
      const patch = reduceKey(s, '', key('', { return: true }).key, 0);
      expect(patch).toEqual({ inputMode: 'normal', hoveredCommentIndex: 0 });
    });

    it('Esc clears filter and exits', () => {
      const s = { ...fresh(), inputMode: 'filter' as const, filter: 'foo' };
      const patch = reduceKey(s, '', key('', { escape: true }).key, 0);
      expect(patch).toEqual({ inputMode: 'normal', filter: '' });
    });

    it('ignores ctrl/meta/tab input', () => {
      const s = { ...fresh(), inputMode: 'filter' as const };
      const patch = reduceKey(s, 'x', key('x', { ctrl: true }).key, 0);
      expect(patch).toBeNull();
    });
  });

  describe('popup mode (falls through to normal navigation)', () => {
    it('popup mode j moves down (falls through)', () => {
      const s = { ...fresh(), inputMode: 'popup' as const, hoveredCommentIndex: 0 };
      const patch = reduceKey(s, 'j', key('j').key, 3);
      expect(patch).toEqual({ hoveredCommentIndex: 1 });
    });
  });
});