import { useInput } from 'ink';
import { useQueryClient } from '@tanstack/react-query';
import type { CommentEntity } from '../comments/comments.domain.ts';
import type { CommentListViewModel } from './comments/view-model.ts';
import { useTuiStore, clampIndex, type TuiState, type TuiKey } from './store.ts';
import { openInEditor } from './openInEditor.ts';

// ── pure key reducer ───────────────────────────────────────────

export function reduceKey(
  state: TuiState,
  input: string,
  key: TuiKey,
  totalCount: number,
): Partial<TuiState> | null {
  // ── filter mode ──────────────────────────────────────────
  if (state.inputMode === 'filter') {
    if (key.escape) return { inputMode: 'normal', filter: '' };
    if (key.return) return { inputMode: 'normal', selectedIndex: 0 };
    if (key.backspace || key.delete) return { filter: state.filter.slice(0, -1) };
    if (input && !key.ctrl && !key.meta && !key.tab) return { filter: state.filter + input };
    return null;
  }

  // ── normal mode ──────────────────────────────────────────
  if (key.upArrow || input === 'k') return { selectedIndex: clampIndex(state.selectedIndex - 1, totalCount) };
  if (key.downArrow || input === 'j') return { selectedIndex: clampIndex(state.selectedIndex + 1, totalCount) };
  if (input === 'R') return { showResolved: !state.showResolved, selectedIndex: 0 };
  if (input === '?') return null; // popup disabled
  if (input === '/') return { inputMode: 'filter' };
  if (key.escape && state.filter) return { filter: '', selectedIndex: 0 };
  return null;
}

// ── hook ───────────────────────────────────────────────────────

export function useHandleInput(
  vm: CommentListViewModel,
  comments: CommentEntity[],
) {
  const queryClient = useQueryClient();

  useInput((input, key) => {
    // side-effect keys (normal mode only) — run before reduceKey
    if (useTuiStore.getState().inputMode === 'normal') {
      if (input === 'r') {
        void queryClient.invalidateQueries({ queryKey: ['comments'] });
        return;
      }
      if (input === 'e') {
        const selectedRow = vm.rows.find((r) => r.isSelected);
        const c = selectedRow ? comments.find((x) => x.id === selectedRow.id) : undefined;
        if (c) openInEditor(c);
        return;
      }
      if (input === 'q' || input === 'Q') {
        process.exit(0);
        return;
      }
    }

    // state-changing keys
    const patch = reduceKey(useTuiStore.getState(), input, {
      upArrow: key.upArrow,
      downArrow: key.downArrow,
      return: key.return,
      escape: key.escape,
      backspace: key.backspace,
      delete: key.delete,
      ctrl: key.ctrl,
      meta: key.meta,
      tab: key.tab,
    }, vm.totalCount);

    if (patch) useTuiStore.getState().applyPatch(patch);
  });
}
