import React, { useState, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CommentStatus } from '../comments/comments.domain.ts';
import type { CommentService } from '../comments/service.ts';

// ── helpers ──────────────────────────────────────────────────────────

function truncateLeft(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return '\u2026' + str.slice(str.length - maxLen + 1);
}

function truncateRight(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '\u2026';
}

function statusIcon(status: CommentStatus): string {
  if (status === CommentStatus.Active) return '\u25cf'; // ●
  if (status === CommentStatus.Resolved) return '\u2713'; // ✓
  return '\u25cb'; // ○ draft
}

function statusColor(status: CommentStatus): string {
  if (status === CommentStatus.Active) return 'yellow';
  if (status === CommentStatus.Resolved) return 'green';
  return 'gray';
}

// ── App ──────────────────────────────────────────────────────────────

type AppProps = {
  service: CommentService;
};

const App: React.FC<AppProps> = ({ service }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const [mode, setMode] = useState<'normal' | 'filter'>('normal');
  const [filterInput, setFilterInput] = useState('');
  const { stdout } = useStdout();
  const queryClient = useQueryClient();

  // ── data ─────────────────────────────────────────────────────────

  const { data: comments = [] } = useQuery({
    queryKey: ['comments'],
    queryFn: () => service.getAllComments(),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => service.resolveComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  });

  const unresolveMutation = useMutation({
    mutationFn: (id: string) => service.unresolveComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CommentStatus }) =>
      service.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  });

  // ── filtering ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!filter) return comments;
    const f = filter.toLowerCase();
    return comments.filter(
      (c) => c.file.toLowerCase().includes(f) || c.message.toLowerCase().includes(f),
    );
  }, [comments, filter]);

  // ── layout ───────────────────────────────────────────────────────

  const termRows = stdout?.rows ?? 24;
  const termCols = stdout?.columns ?? 80;
  const headerHeight = 2;
  const footerHeight = mode === 'filter' ? 3 : 0;
  const maxVisible = Math.max(1, termRows - headerHeight - footerHeight);

  const clampedIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));
  const startIdx = Math.max(0, clampedIndex - Math.floor(maxVisible / 2));
  const endIdx = Math.min(filtered.length, startIdx + maxVisible);
  const visibleComments = filtered.slice(startIdx, endIdx);

  // column widths
  const prefixWidth = 12; // "● 3f8a1b2c "
  const fileColMax = Math.min(30, Math.floor(termCols * 0.32));
  const msgColMax = Math.max(10, termCols - prefixWidth - fileColMax - 2);

  // ── keyboard ─────────────────────────────────────────────────────

  useInput((input, key) => {
    // filter mode
    if (mode === 'filter') {
      if (key.escape) {
        setMode('normal');
        setFilterInput('');
      } else if (key.return) {
        setFilter(filterInput.trim());
        setMode('normal');
        setSelectedIndex(0);
      } else if (key.backspace || key.delete) {
        setFilterInput((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta && !key.tab) {
        setFilterInput((prev) => prev + input);
      }
      return;
    }

    // normal mode
    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (input === 'r') {
      const c = filtered[clampedIndex];
      if (!c) return;
      const shortId = c.id.slice(0, 8);
      if (c.status === CommentStatus.Draft) {
        setStatusMutation.mutate({ id: shortId, status: CommentStatus.Active });
      } else if (c.status === CommentStatus.Active) {
        resolveMutation.mutate(shortId);
      } else if (c.status === CommentStatus.Resolved) {
        unresolveMutation.mutate(shortId);
      }
    } else if (input === '/') {
      setMode('filter');
      setFilterInput(filter);
    } else if (input === 'q' || input === 'Q') {
      process.exit(0);
    } else if (key.escape) {
      if (filter) {
        setFilter('');
        setSelectedIndex(0);
      }
    }
  });

  // ── render ───────────────────────────────────────────────────────

  const showScrollTop = startIdx > 0;
  const showScrollBottom = endIdx < filtered.length;

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* title */}
      <Box>
        <Text bold>agent-comments</Text>
        <Text dimColor>  {filtered.length} comment{filtered.length !== 1 ? 's' : ''}</Text>
        {filter ? <Text color="yellow">  filter: "{filter}"</Text> : null}
      </Box>

      {/* column header */}
      <Box>
        <Text dimColor>
          {'ID'.padEnd(prefixWidth)}{'FILE:LINE'.padEnd(fileColMax)}MESSAGE
        </Text>
      </Box>

      {/* rows */}
      {visibleComments.map((c, i) => {
        const globalIdx = startIdx + i;
        const isSelected = globalIdx === clampedIndex;
        const icon = statusIcon(c.status);
        const shortId = c.id.slice(0, 8);
        const lineLabel = c.startLine === c.endLine ? `${c.startLine}` : `${c.startLine}-${c.endLine}`;
        const maxFile = fileColMax - String(lineLabel).length - 1;
        const fileLine = `${truncateLeft(c.file, Math.max(4, maxFile))}:${lineLabel}`;
        const prefix = `${icon} ${shortId}`.padEnd(prefixWidth);
        const fileCol = fileLine.padEnd(fileColMax);
        const msg = truncateRight(c.message, msgColMax);

        return (
          <Box key={c.id}>
            <Text inverse={isSelected} color={isSelected ? undefined : statusColor(c.status)}>
              {prefix}
            </Text>
            <Text
              inverse={isSelected}
              dimColor={!isSelected && c.status === CommentStatus.Resolved}
            >
              {fileCol}
            </Text>
            <Text
              inverse={isSelected}
              dimColor={!isSelected && c.status === CommentStatus.Resolved}
            >
              {' '}{msg}
            </Text>
          </Box>
        );
      })}

      {/* scroll indicators */}
      {showScrollTop && (
        <Box>
          <Text dimColor>{' '.repeat(prefixWidth)}▲ more above</Text>
        </Box>
      )}

      {/* empty state */}
      {filtered.length === 0 && (
        <Box>
          <Text dimColor>
            {filter ? `  No comments matching "${filter}"` : '  No comments yet'}
          </Text>
        </Box>
      )}

      {showScrollBottom && (
        <Box>
          <Text dimColor>{' '.repeat(prefixWidth)}▼ more below</Text>
        </Box>
      )}

      {/* footer */}
      {mode === 'filter' && (
        <Box marginTop={1} flexDirection="column">
          <Text>
            Filter: <Text color="yellow">{filterInput}</Text>
            <Text dimColor>█</Text>
          </Text>
          <Text dimColor>  Enter apply  |  Esc cancel</Text>
        </Box>
      )}
    </Box>
  );
};

export default App;