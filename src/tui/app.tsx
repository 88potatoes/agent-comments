import React, { useMemo, useEffect } from 'react';
import { useInput, useFocus } from 'ink';
import { useQueryClient } from '@tanstack/react-query';
import { spawn } from 'node:child_process';
import type { CommentEntity } from '../comments/comments.domain.ts';
import { useQueryComments } from './hooks/comments/useQueryComments.ts';
import { GlobalProviders } from './GlobalProviders.tsx';
import { getRepoRoot } from '../lib/db.ts';
import { useTuiStore } from './store.ts';
import { toCommentListViewModel } from './comments/logic.ts';
import { CommentList } from './comments/components/CommentList.tsx';

// ── open in editor ───────────────────────────────────────────────

function openInEditor(c: CommentEntity) {
  const repoRoot = getRepoRoot();
  const absPath = `${repoRoot}/${c.file}`;
  const editor = process.env.EDITOR || process.env.VISUAL;

  if (editor) {
    const isVi = /\b(vim?|nvim|vi)\b/.test(editor);
    const args = isVi ? [`+${c.startLine}`, absPath] : [absPath];
    spawn(editor, args, { stdio: 'inherit', shell: true });
  } else {
    const codeProc = spawn('code', ['-g', `${absPath}:${c.startLine}`], { stdio: 'ignore', shell: true });
    codeProc.on('error', () => {
      spawn('open', [absPath], { stdio: 'ignore', shell: true });
    });
  }
}

// ── App ───────────────────────────────────────────────────────────

const AppInner: React.FC = () => {
  const state = useTuiStore();
  const queryClient = useQueryClient();
  const { isFocused } = useFocus();

  // ── server data ──────────────────────────────────────────────────

  const { data: comments = [] } = useQueryComments();

  // ── view model ───────────────────────────────────────────────────

  const repoRoot = useMemo(() => getRepoRoot(), []);

  const vm = useMemo(
    () => toCommentListViewModel(comments, state, repoRoot),
    [comments, state, repoRoot],
  );

  // ── sync comment count to store ──────────────────────────────────

  useEffect(() => {
    useTuiStore.getState().setCommentCount(vm.totalCount);
  }, [vm.totalCount]);

  // ── selected comment (for side effects) ──────────────────────────

  const selectedRow = vm.rows.find((r) => r.isSelected);
  const selectedComment: CommentEntity | undefined = selectedRow
    ? comments.find((c) => c.id === selectedRow.id)
    : undefined;

  // ── invalidate on focus ──────────────────────────────────────────

  useEffect(() => {
    if (isFocused) {
      void queryClient.invalidateQueries({ queryKey: ['comments'] });
    }
  }, [isFocused, queryClient]);

  // ── keyboard (side effects only) ─────────────────────────────────

  useInput((input, key) => {
    // Side-effect keys in normal mode
    if (state.mode === 'normal') {
      if (input === 'r') {
        void queryClient.invalidateQueries({ queryKey: ['comments'] });
        return;
      }
      if (input === 'e') {
        if (selectedComment) openInEditor(selectedComment);
        return;
      }
      if (input === 'q' || input === 'Q') {
        process.exit(0);
        return;
      }
    }

    // Dispatch all other keys to the store
    useTuiStore.getState().handleKey(input, {
      upArrow: key.upArrow,
      downArrow: key.downArrow,
      return: key.return,
      escape: key.escape,
      backspace: key.backspace,
      delete: key.delete,
      ctrl: key.ctrl,
      meta: key.meta,
      tab: key.tab,
    });
  });

  // ── render ───────────────────────────────────────────────────────

  return <CommentList vm={vm} />;
};

// ── export ────────────────────────────────────────────────────────

const App: React.FC = () => (
  <GlobalProviders>
    <AppInner />
  </GlobalProviders>
);

export default App;