import React, { useMemo, useEffect } from 'react';
import { useInput, useFocus } from 'ink';
import { useQueryClient } from '@tanstack/react-query';
import { spawn } from 'node:child_process';
import { CommentStatus } from '../comments/comments.domain.ts';
import type { CommentEntity } from '../comments/comments.domain.ts';
import { useQueryComments } from './hooks/comments/useQueryComments.ts';
import { useMutateResolveComment } from './hooks/comments/useMutateResolveComment.ts';
import { useMutateUnresolveComment } from './hooks/comments/useMutateUnresolveComment.ts';
import { useMutateSetStatus } from './hooks/comments/useMutateSetStatus.ts';
import { useMutateDeleteComment } from './hooks/comments/useMutateDeleteComment.ts';
import { GlobalProviders } from './GlobalProviders.tsx';
import { getRepoRoot } from '../lib/db.ts';
import { useTuiStore } from './useTuiStore.ts';
import { tuiStore } from './store.ts';
import { toCommentListViewModel, filterComments } from './comments/logic.ts';
import { useCommentCommands } from './comments/hooks/useCommentCommands.ts';
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
  const commands = useCommentCommands();

  // ── server data ──────────────────────────────────────────────────

  const { data: comments = [] } = useQueryComments();

  const resolveMutation = useMutateResolveComment();
  const unresolveMutation = useMutateUnresolveComment();
  const setStatusMutation = useMutateSetStatus();
  const deleteMutation = useMutateDeleteComment();

  // ── sync comment count to store ──────────────────────────────────

  const filtered = useMemo(
    () => filterComments(comments, state.filter, state.showResolved),
    [comments, state.filter, state.showResolved],
  );

  useEffect(() => {
    tuiStore.dispatch({ type: 'tui/setCommentCount', count: filtered.length });
  }, [filtered.length]);

  // ── invalidate on focus ──────────────────────────────────────────

  useEffect(() => {
    if (isFocused) {
      void queryClient.invalidateQueries({ queryKey: ['comments'] });
    }
  }, [isFocused, queryClient]);

  // ── view model ───────────────────────────────────────────────────

  const repoRoot = useMemo(() => getRepoRoot(), []);

  const vm = useMemo(
    () => toCommentListViewModel(comments, state, repoRoot),
    [comments, state, repoRoot],
  );

  // ── selected comment (for side effects) ──────────────────────────

  const clampedIndex = Math.min(state.selectedIndex, Math.max(0, filtered.length - 1));
  const selectedComment: CommentEntity | undefined = filtered[clampedIndex];

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

    // Side-effect keys in popup mode
    if (state.mode === 'popup' && vm.popup) {
      if (key.return) {
        handlePopupAction(
          vm.popup.actions[state.popupIndex]?.key,
          selectedComment,
          { resolveMutation, unresolveMutation, setStatusMutation, deleteMutation },
        );
        commands.closePopup();
        return;
      }
      // Direct key press
      const match = vm.popup.actions.find((a) => a.key === input);
      if (match) {
        const closed = handlePopupAction(
          match.key,
          selectedComment,
          { resolveMutation, unresolveMutation, setStatusMutation, deleteMutation },
        );
        if (closed) commands.closePopup();
        return;
      }
    }

    // Dispatch all other keys to the store
    tuiStore.dispatch({
      type: 'tui/key',
      input,
      key: {
        upArrow: key.upArrow,
        downArrow: key.downArrow,
        return: key.return,
        escape: key.escape,
        backspace: key.backspace,
        delete: key.delete,
        ctrl: key.ctrl,
        meta: key.meta,
        tab: key.tab,
      },
    });
  });

  // ── render ───────────────────────────────────────────────────────

  return <CommentList vm={vm} />;
};

// ── popup action handler (side effects) ───────────────────────────

type Mutations = {
  resolveMutation: ReturnType<typeof useMutateResolveComment>;
  unresolveMutation: ReturnType<typeof useMutateUnresolveComment>;
  setStatusMutation: ReturnType<typeof useMutateSetStatus>;
  deleteMutation: ReturnType<typeof useMutateDeleteComment>;
};

function handlePopupAction(
  key: string | undefined,
  comment: CommentEntity | undefined,
  m: Mutations,
): boolean {
  if (!key || !comment) return false;
  const shortId = comment.id.slice(0, 8);

  switch (key) {
    case 'r': {
      if (comment.status === CommentStatus.Draft) {
        m.setStatusMutation.mutate({ id: shortId, status: CommentStatus.Active });
      } else {
        m.resolveMutation.mutate(shortId);
      }
      return true;
    }
    case 'u': {
      m.unresolveMutation.mutate(shortId);
      return true;
    }
    case 'd': {
      m.deleteMutation.mutate(shortId);
      return true;
    }
    case 'e': {
      openInEditor(comment);
      return false;
    }
    case 'y': {
      process.stdout.write(shortId);
      return false;
    }
    default:
      return false;
  }
}

// ── export ────────────────────────────────────────────────────────

const App: React.FC = () => (
  <GlobalProviders>
    <AppInner />
  </GlobalProviders>
);

export default App;