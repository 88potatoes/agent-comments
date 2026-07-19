import React, { useEffect } from 'react';
import { useFocus } from 'ink';
import { useQueryClient } from '@tanstack/react-query';
import { GlobalProviders } from './GlobalProviders.tsx';
import { useTuiStore } from './store.ts';
import { CommentList } from './comments/components/CommentList.tsx';
import { useHandleInput } from './useHandleInput.ts';
import { useCommentListViewModel } from './comments/hooks/useCommentListViewModel.ts';

// ── App ───────────────────────────────────────────────────────────

const AppInner: React.FC = () => {
  const state = useTuiStore();
  const queryClient = useQueryClient();
  const { isFocused } = useFocus();

  // ── data + view model ────────────────────────────────────────────

  const { vm, comments } = useCommentListViewModel();

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