import React from 'react';
import { Box, Text } from 'ink';
import type { CommentRowViewModel } from '../view-model.ts';
import { truncateLeft, truncateRight } from '../../helpers.tsx';

type CommentRowProps = {
  row: CommentRowViewModel;
  prefixWidth: number;
  fileColMax: number;
  msgColMax: number;
};

export const CommentRow: React.FC<CommentRowProps> = ({ row, prefixWidth, fileColMax, msgColMax }) => {
  const prefix = `${row.icon} ${row.shortId}`.padEnd(prefixWidth);

  const lineLabel = row.startLine === row.endLine
    ? `${row.startLine}`
    : `${row.startLine}-${row.endLine}`;
  const maxFile = fileColMax - String(lineLabel).length - 1;
  const fileLine = `${truncateLeft(row.file, Math.max(4, maxFile))}:${lineLabel}`;
  const fileCol = fileLine.padEnd(fileColMax);
  const msg = truncateRight(row.message, msgColMax);

  return (
    <Box>
      <Text inverse={row.isSelected} color={row.isSelected ? undefined : row.iconColor}>
        {prefix}
      </Text>
      <Text
        inverse={row.isSelected}
        dimColor={!row.isSelected && row.isResolved}
      >
        {fileCol}
      </Text>
      <Text
        inverse={row.isSelected}
        dimColor={!row.isSelected && row.isResolved}
      >
        {' '}{msg}
      </Text>
    </Box>
  );
};