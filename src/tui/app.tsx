import React, { useCallback, useEffect } from 'react';
import { Box, Text, useFocus } from 'ink';
import { useQueryClient } from '@tanstack/react-query';
import { GlobalProviders } from './GlobalProviders.tsx';
import { useTuiStore } from './store.ts';
import { CommentList } from './comments/components/CommentList.tsx';
import { HelpScreen } from './HelpScreen.tsx';
import { useHandleInput } from './useHandleInput.ts';
import { openInEditor } from './openInEditor.ts';
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

  // ── help action handler ────────────────────────────────────────

  const handleHelpAction = useCallback(
    (actionKey: string) => {
      const s = useTuiStore.getState();
      switch (actionKey) {
        case 'r':
          void queryClient.invalidateQueries({ queryKey: ['comments'] });
          break;
        case 'R':
          s.toggleShowResolved();
          break;
        case 'e': {
          const c = comments[s.hoveredCommentIndex];
          if (c) openInEditor(c);
          break;
        }
        case '/':
          s.setInputMode('list-filter');
          break;
        case 'Esc':
          s.setFilter('');
          s.setHoveredCommentIndex(0);
          break;
        case 'Enter':
          s.setInputMode('list');
          s.setHoveredCommentIndex(0);
          break;
        case '?':
          // just close help (already handled by onClose)
          break;
        case 'q':
          process.exit(0);
          break;
      }
    },
    [queryClient, comments, state.inputMode],
  );

  // ── render ───────────────────────────────────────────────────────

  return (
    <Box flexDirection="column">
      <CommentList vm={vm} />
      {state.inputMode === 'help' && (
        <>
          <Text dimColor>{'─'.repeat(process.stdout.columns || 80)}</Text>
          <HelpScreen
            mode="list"
            hasFilter={state.filter.length > 0}
            hasComments={comments.length > 0}
            onClose={() => {
              useTuiStore.getState().setInputMode('list');
              useTuiStore.getState().setHoveredHelpIndex(0);
            }}
            onAction={handleHelpAction}
          />
        </>
      )}
    </Box>
  );
};

// ── export ────────────────────────────────────────────────────────

const App: React.FC = () => (
  <GlobalProviders>
    <AppInner />
  </GlobalProviders>
);

export default App;