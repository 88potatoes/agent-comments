import React, { useEffect } from 'react';
import { Box, Text, useFocus } from 'ink';
import { GlobalProviders } from './GlobalProviders.tsx';
import { CommentList } from './comments/components/CommentList.tsx';
import { HelpScreen } from './HelpScreen.tsx';
import { useHandleInput } from './useHandleInput.ts';
import { useCommentCommands } from './comments/hooks/useCommentCommands.ts';
import { useCommentListViewModel } from './comments/hooks/useCommentListViewModel.ts';

// ── App ───────────────────────────────────────────────────────────

const AppInner: React.FC = () => {
  const { isFocused } = useFocus();
  const { vm } = useCommentListViewModel();
  const commands = useCommentCommands(vm.rows);

  useHandleInput(commands);

  useEffect(() => {
    if (isFocused) {
      commands.refresh();
    }
  }, [isFocused, commands.refresh]);

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
            onActivate={(key) => commands.helpActivate(key)}
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
