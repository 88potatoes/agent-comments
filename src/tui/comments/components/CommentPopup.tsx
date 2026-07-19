import React from 'react';
import { Box, Text } from 'ink';
import type { CommentPopupViewModel } from '../view-model.ts';

type CommentPopupProps = {
  popup: CommentPopupViewModel;
};

export const CommentPopup: React.FC<CommentPopupProps> = ({ popup }) => {
  return (
    <Box marginTop={1} flexDirection="column" borderStyle="round" paddingX={1}>
      <Box>
        <Text bold>{popup.headerFileLine}</Text>
      </Box>
      <Box>
        <Text dimColor>{popup.headerMessage}</Text>
      </Box>
      {popup.actions.map((a, i) => (
        <Box key={a.key}>
          <Text inverse={i === popup.selectedActionIndex} color={i === popup.selectedActionIndex ? undefined : 'cyan'}>
            {i === popup.selectedActionIndex ? '▶' : ' '} [{a.key}] {a.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};