import { useInput } from 'ink';
import { useQueryClient } from '@tanstack/react-query';
import type { CommentEntity } from '../comments/comments.domain.ts';
import type { CommentListViewModel } from './comments/view-model.ts';
import { useTuiStore, clampIndex, type TuiKey } from './store.ts';
import { openInEditor } from './openInEditor.ts';

// ── handlers ───────────────────────────────────────────────────

export function handleListInput(
  input: string,
  key: TuiKey,
  vm: CommentListViewModel,
  comments: CommentEntity[],
  queryClient: ReturnType<typeof useQueryClient>,
) {
  // side-effect keys
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
  }

  const s = useTuiStore.getState();

  // navigation
  if (key.upArrow || input === 'k') {
    s.setHoveredCommentIndex(clampIndex(s.hoveredCommentIndex - 1, vm.totalCount));
    return;
  }
  if (key.downArrow || input === 'j') {
    s.setHoveredCommentIndex(clampIndex(s.hoveredCommentIndex + 1, vm.totalCount));
    return;
  }

  // toggles / mode switches
  if (input === 'R') {
    s.toggleShowResolved();
    return;
  }
  if (input === '/') {
    s.setInputMode('list-filter');
    return;
  }
  if (key.escape && s.filter) {
    s.setFilter('');
    s.setHoveredCommentIndex(0);
    return;
  }
  if (input === '?') {
    s.setInputMode('help');
    return;
  }
}

export function handleListFilterInput(input: string, key: TuiKey) {
  const s = useTuiStore.getState();

  if (key.escape) {
    s.setInputMode('list');
    s.setFilter('');
    return;
  }
  if (key.return) {
    s.setInputMode('list');
    s.setHoveredCommentIndex(0);
    return;
  }
  if (key.backspace || key.delete) {
    s.setFilter(s.filter.slice(0, -1));
    return;
  }
  if (input && !key.ctrl && !key.meta && !key.tab) {
    s.setFilter(s.filter + input);
    return;
  }
}

export function handleHelpInput(input: string, key: TuiKey) {
  if (key.escape || input === 'q' || input === '?') {
    useTuiStore.getState().setInputMode('list');
  }
}

// ── hook ───────────────────────────────────────────────────────

export function useHandleInput(
  vm: CommentListViewModel,
  comments: CommentEntity[],
) {
  const queryClient = useQueryClient();
  const inputMode = useTuiStore((s) => s.inputMode);

  useInput((input, key) => {
    switch (inputMode) {
      case 'list':
        handleListInput(input, key, vm, comments, queryClient);
        break;
      case 'list-filter':
        handleListFilterInput(input, key);
        break;
      case 'help':
        handleHelpInput(input, key);
        break;
    }
  });
}