import React, { useMemo } from 'react';
import { Box, Text, useStdout } from 'ink';
import type { CommentListViewModel } from '../view-model.ts';
import { CommentRow } from './CommentRow.tsx';
import { CommentPopup } from './CommentPopup.tsx';
import { FilterBar } from './FilterBar.tsx';

type CommentListProps = {
  vm: CommentListViewModel;
};

export const CommentList: React.FC<CommentListProps> = ({ vm }) => {
  const { stdout } = useStdout();
  const termRows = stdout?.rows ?? 24;
  const termCols = stdout?.columns ?? 80;

  // ── layout ─────────────────────────────────────────────────────

  const prefixWidth = 12;
  const fileColMax = Math.min(30, Math.floor(termCols * 0.32));
  const msgColMax = Math.max(10, termCols - prefixWidth - fileColMax - 2);

  const popupHeight = 8;
  const headerHeight = 2;
  const popupActive = vm.popup !== null;
  const filterActive = vm.filterBar !== null;
  const footerHeight = filterActive ? 3 : popupActive ? popupHeight : 0;
  const maxVisible = Math.max(1, termRows - headerHeight - footerHeight);

  const selectedIndex = vm.rows.findIndex((r) => r.isSelected);
  const { visibleRows, showScrollTop, showScrollBottom } = useMemo(() => {
    const clamped = selectedIndex === -1 ? 0 : selectedIndex;
    const startIdx = Math.max(0, clamped - Math.floor(maxVisible / 2));
    const endIdx = Math.min(vm.rows.length, startIdx + maxVisible);
    return {
      visibleRows: vm.rows.slice(startIdx, endIdx),
      showScrollTop: startIdx > 0,
      showScrollBottom: endIdx < vm.rows.length,
    };
  }, [vm.rows, selectedIndex, maxVisible]);

  // ── empty state ────────────────────────────────────────────────

  const isEmpty = vm.rows.length === 0;
  const emptyMessage = useMemo(() => {
    if (vm.filter) return '  No matching comments';
    if (!vm.showResolved) return '  No matching comments';
    return '  No comments yet';
  }, [vm.filter, vm.showResolved]);

  // ── render ─────────────────────────────────────────────────────

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* title */}
      <Box>
        <Text bold>agent-comments</Text>
        <Text dimColor>  {vm.repoRoot}</Text>
        <Text dimColor>  {vm.totalCount} comment{vm.totalCount !== 1 ? 's' : ''}</Text>
        <Text dimColor>  [? actions]</Text>
        {vm.filter ? <Text color="yellow">  filter: "{vm.filter}"</Text> : null}
        {!vm.showResolved && <Text color="yellow">  hiding resolved</Text>}
      </Box>

      {/* column header */}
      <Box>
        <Text dimColor>
          {'ID'.padEnd(prefixWidth)}{'FILE:LINE'.padEnd(fileColMax)}MESSAGE
        </Text>
      </Box>

      {/* rows */}
      {visibleRows.map((row) => (
        <CommentRow
          key={row.id}
          row={row}
          prefixWidth={prefixWidth}
          fileColMax={fileColMax}
          msgColMax={msgColMax}
        />
      ))}

      {/* scroll indicators */}
      {showScrollTop && (
        <Box>
          <Text dimColor>{' '.repeat(prefixWidth)}▲ more above</Text>
        </Box>
      )}

      {/* empty state */}
      {isEmpty && (
        <Box>
          <Text dimColor>{emptyMessage}</Text>
        </Box>
      )}

      {showScrollBottom && (
        <Box>
          <Text dimColor>{' '.repeat(prefixWidth)}▼ more below</Text>
        </Box>
      )}

      {/* footer: filter */}
      {vm.filterBar && <FilterBar filterBar={vm.filterBar} />}

      {/* footer: popup */}
      {vm.popup && <CommentPopup popup={vm.popup} />}
    </Box>
  );
};