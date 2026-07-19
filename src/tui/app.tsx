import React, { useCallback, useEffect } from 'react';
import { Box, Text, useFocus } from 'ink';
import { GlobalProviders } from './GlobalProviders.tsx';
import { CommentList } from './comments/components/CommentList.tsx';
import { HelpScreen } from './HelpScreen.tsx';
import { useHandleInput } from './useHandleInput.ts';
import { useCommentCommands } from './comments/hooks/useCommentCommands.ts';
import { useCommentListViewModel } from './comments/hooks/useCommentListViewModel.ts';
import { openInEditor } from './openInEditor.ts';

// ── App ───────────────────────────────────────────────────────────

const AppInner: React.FC = () => {
  const { isFocused } = useFocus();

  // ── data ─────────────────────────────────────────────────────────

  const { vm } = useCommentListViewModel();

  // ── commands (zero data params — all state from store) ───────────

  const commands = useCommentCommands();

  // ── edit comment (wired from view model, not in commands) ────────

  const editComment = useCallback(() => {
    const row = vm.rows[commands.hoveredCommentIndex];
    if (row) openInEditor(row.file, row.startLine);
  }, [vm.rows, commands.hoveredCommentIndex]);

  // ── keyboard input ───────────────────────────────────────────────

  useHandleInput({ ...commands, editComment });

  // ── invalidate on focus ──────────────────────────────────────────

  useEffect(() => {
    if (isFocused) {
      commands.refresh();
    }
  }, [isFocused, commands.refresh]);

  // ── render ───────────────────────────────────────────────────────

  return (
    <Box flexDirection="column">
      <CommentList vm={vm} />
      {commands.inputMode === 'help' && (
        <>
          <Text dimColor>{'─'.repeat(process.stdout.columns || 80)}</Text>
          <HelpScreen
            mode="list"
            hasFilter={commands.hasFilter}
            hasComments={vm.totalCount > 0}
            hoveredHelpIndex={commands.hoveredHelpIndex}
            onClose={commands.closeHelp}
            onMoveUp={commands.helpMoveUp}
            onMoveDown={commands.helpMoveDown}
            onActivate={(key) => commands.helpActivate(key, editComment)}
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