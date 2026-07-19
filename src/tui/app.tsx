import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput, useStdout, useFocus } from 'ink';
import { useQueryClient } from '@tanstack/react-query';
import { exec } from 'node:child_process';
import { CommentStatus } from '../comments/comments.domain.ts';
import type { CommentEntity } from '../comments/comments.domain.ts';
import { useQueryComments } from './hooks/comments/useQueryComments.ts';
import { useMutateResolveComment } from './hooks/comments/useMutateResolveComment.ts';
import { useMutateUnresolveComment } from './hooks/comments/useMutateUnresolveComment.ts';
import { useMutateSetStatus } from './hooks/comments/useMutateSetStatus.ts';
import { truncateLeft, truncateRight, statusIcon, statusColor } from './helpers.tsx';
import { GlobalProviders } from './GlobalProviders.tsx';
import { getRepoRoot } from '../lib/db.ts';

// ── open in editor ───────────────────────────────────────────────

function openInEditor(c: CommentEntity) {
  const repoRoot = getRepoRoot();
  const absPath = `${repoRoot}/${c.file}`;
  const editor = process.env.EDITOR || process.env.VISUAL;

  if (editor) {
    // Try editor-aware line: vim/nvim/vi use +<line>
    const isVi = /\b(vim?|nvim|vi)\b/.test(editor);
    const cmd = isVi
      ? `${editor} +${c.startLine} '${absPath}'`
      : `${editor} '${absPath}'`;
    exec(cmd, (err) => {
      if (err) console.error(`Failed to open editor: ${err.message}`);
    });
  } else {
    // Fallback: VS Code or macOS 'open'
    exec(`code -g '${absPath}:${c.startLine}'`, (err) => {
      if (err) {
        exec(`open -t '${absPath}'`);
      }
    });
  }
}

// ── popup actions ─────────────────────────────────────────────────

type PopupAction = {
  key: string;
  label: string;
  action: () => void;
};

const App: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const [showResolved, setShowResolved] = useState(true);
  const [mode, setMode] = useState<'normal' | 'filter' | 'popup'>('normal');
  const [filterInput, setFilterInput] = useState('');
  const [popupIndex, setPopupIndex] = useState(0);
  const { stdout } = useStdout();
  const queryClient = useQueryClient();
  const { isFocused } = useFocus();

  // ── data ─────────────────────────────────────────────────────────

  const { data: comments = [] } = useQueryComments();

  const resolveMutation = useMutateResolveComment();

  const unresolveMutation = useMutateUnresolveComment();

  const setStatusMutation = useMutateSetStatus();

  // ── invalidate on focus ──────────────────────────────────────────

  useEffect(() => {
    if (isFocused) {
      void queryClient.invalidateQueries({ queryKey: ['comments'] });
    }
  }, [isFocused, queryClient]);

  // ── filtering ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = comments;
    if (!showResolved) {
      result = result.filter((c) => c.status !== CommentStatus.Resolved);
    }
    if (filter) {
      const f = filter.toLowerCase();
      result = result.filter(
        (c) => c.file.toLowerCase().includes(f) || c.message.toLowerCase().includes(f),
      );
    }
    return result;
  }, [comments, filter, showResolved]);

  // ── layout ───────────────────────────────────────────────────────

  const termRows = stdout?.rows ?? 24;
  const termCols = stdout?.columns ?? 80;
  const popupHeight = 8;
  const headerHeight = 2;
  const footerHeight = mode === 'filter' ? 3 : mode === 'popup' ? popupHeight : 0;
  const maxVisible = Math.max(1, termRows - headerHeight - footerHeight);

  const clampedIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));
  const startIdx = Math.max(0, clampedIndex - Math.floor(maxVisible / 2));
  const endIdx = Math.min(filtered.length, startIdx + maxVisible);
  const visibleComments = filtered.slice(startIdx, endIdx);

  // column widths
  const prefixWidth = 12; // "● 3f8a1b2c "
  const fileColMax = Math.min(30, Math.floor(termCols * 0.32));
  const msgColMax = Math.max(10, termCols - prefixWidth - fileColMax - 2);

  // ── popup actions ────────────────────────────────────────────────

  const selectedComment = filtered[clampedIndex];

  const popupActions: PopupAction[] = useMemo(() => {
    if (!selectedComment) return [];
    const shortId = selectedComment.id.slice(0, 8);
    const canResolve = selectedComment.status === CommentStatus.Active || selectedComment.status === CommentStatus.Draft;
    const canUnresolve = selectedComment.status === CommentStatus.Resolved;
    return [
      ...(canResolve
        ? [
            {
              key: 'r',
              label: selectedComment.status === CommentStatus.Draft
                ? 'Activate (draft → active)'
                : 'Resolve',
              action: () => {
                if (selectedComment.status === CommentStatus.Draft) {
                  setStatusMutation.mutate({ id: shortId, status: CommentStatus.Active });
                } else {
                  resolveMutation.mutate(shortId);
                }
                setMode('normal');
              },
            },
          ]
        : []),
      ...(canUnresolve
        ? [
            {
              key: 'u',
              label: 'Unresolve',
              action: () => {
                unresolveMutation.mutate(shortId);
                setMode('normal');
              },
            },
          ]
        : []),
      {
        key: 'e',
        label: 'Open in editor',
        action: () => {
          openInEditor(selectedComment);
        },
      },
      {
        key: 'c',
        label: 'Copy ID',
        action: () => {
          // Write the short ID to stdout so it can be piped
          process.stdout.write(shortId);
        },
      },
      {
        key: 'Esc',
        label: 'Cancel',
        action: () => setMode('normal'),
      },
    ];
  }, [selectedComment, resolveMutation, unresolveMutation, setStatusMutation]);

  // ── keyboard ─────────────────────────────────────────────────────

  useInput((input, key) => {
    // popup mode
    if (mode === 'popup') {
      if (key.escape) {
        setMode('normal');
      } else if (key.upArrow || input === 'k') {
        setPopupIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow || input === 'j') {
        setPopupIndex((i) => Math.min(popupActions.length - 1, i + 1));
      } else if (key.return) {
        const action = popupActions[popupIndex];
        if (action) action.action();
      } else {
        // direct key press for any action
        const match = popupActions.find((a) => a.key === input);
        if (match) match.action();
      }
      return;
    }

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
      void queryClient.invalidateQueries({ queryKey: ['comments'] });
    } else if (input === 'R') {
      setShowResolved((v) => !v);
      setSelectedIndex(0);
    } else if (input === 'e') {
      if (selectedComment) openInEditor(selectedComment);
    } else if (key.return) {
      if (filtered.length > 0) {
        setMode('popup');
        setPopupIndex(0);
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
    <GlobalProviders>
      <Box flexDirection="column" paddingX={1}>
      {/* title */}
      <Box>
        <Text bold>agent-comments</Text>
        <Text dimColor>  {filtered.length} comment{filtered.length !== 1 ? 's' : ''}</Text>
        {filter ? <Text color="yellow">  filter: "{filter}"</Text> : null}
        {!showResolved && <Text color="yellow">  hiding resolved</Text>}
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
            {filter || !showResolved ? '  No matching comments' : '  No comments yet'}
          </Text>
        </Box>
      )}

      {showScrollBottom && (
        <Box>
          <Text dimColor>{' '.repeat(prefixWidth)}▼ more below</Text>
        </Box>
      )}

      {/* footer: filter mode */}
      {mode === 'filter' && (
        <Box marginTop={1} flexDirection="column">
          <Text>
            Filter: <Text color="yellow">{filterInput}</Text>
            <Text dimColor>█</Text>
          </Text>
          <Text dimColor>  Enter apply  |  Esc cancel</Text>
        </Box>
      )}

      {/* footer: popup */}
      {mode === 'popup' && selectedComment && (
        <Box marginTop={1} flexDirection="column" borderStyle="round" paddingX={1}>
          <Box>
            <Text bold>
              {selectedComment.file}:{selectedComment.startLine === selectedComment.endLine
                ? selectedComment.startLine
                : `${selectedComment.startLine}-${selectedComment.endLine}`}
            </Text>
          </Box>
          <Box>
            <Text dimColor>{truncateRight(selectedComment.message, 60)}</Text>
          </Box>
          {popupActions.map((a, i) => (
            <Box key={a.key}>
              <Text inverse={i === popupIndex} color={i === popupIndex ? undefined : 'cyan'}>
                {i === popupIndex ? '▶' : ' '} [{a.key}] {a.label}
              </Text>
            </Box>
          ))}
        </Box>
      )}
      </Box>
    </GlobalProviders>
  );
};

export default App;