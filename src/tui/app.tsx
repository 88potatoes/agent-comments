import React, { useMemo, useEffect } from 'react';
import { useFocus } from 'ink';
import { useQueryClient } from '@tanstack/react-query';
import { useQueryComments } from './hooks/comments/useQueryComments.ts';
import { GlobalProviders } from './GlobalProviders.tsx';
import { getRepoRoot } from '../lib/db.ts';
import { useTuiStore } from './store.ts';
import { toCommentListViewModel } from './comments/logic.ts';
import { CommentList } from './comments/components/CommentList.tsx';
import { useHandleInput } from './useHandleInput.ts';

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

  // ── invalidate on focus ──────────────────────────────────────────

  useEffect(() => {
    if (isFocused) {
      void queryClient.invalidateQueries({ queryKey: ['comments'] });
    }
  }, [isFocused, queryClient]);

  // ── keyboard input ───────────────────────────────────────────────

  useHandleInput(vm, comments);

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