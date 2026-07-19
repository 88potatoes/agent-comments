import React, { useMemo, useEffect } from 'react';
import { Box, Text, useInput, useStdout, useFocus } from 'ink';
import { useQueryClient } from '@tanstack/react-query';
import { spawn } from 'node:child_process';
import { CommentStatus } from '../comments/comments.domain.ts';
import type { CommentEntity } from '../comments/comments.domain.ts';
import { useQueryComments } from './hooks/comments/useQueryComments.ts';
import { useMutateResolveComment } from './hooks/comments/useMutateResolveComment.ts';
import { useMutateUnresolveComment } from './hooks/comments/useMutateUnresolveComment.ts';
import { useMutateSetStatus } from './hooks/comments/useMutateSetStatus.ts';
import { useMutateDeleteComment } from './hooks/comments/useMutateDeleteComment.ts';
import { truncateLeft, truncateRight, statusIcon, statusColor } from './helpers.tsx';
import { GlobalProviders } from './GlobalProviders.tsx';
import { getRepoRoot } from '../lib/db.ts';
import { useTuiStore } from './useTuiStore.ts';
import { tuiStore } from './store.ts';

// ── open in editor ───────────────────────────────────────────────

function openInEditor(c: CommentEntity) {
  const repoRoot = getRepoRoot();
  const absPath = `${repoRoot}/${c.file}`;
  const editor = process.env.EDITOR || process.env.VISUAL;

  if (editor) {
    const isVi = /\b(vim?|nvim|vi)\b/.test(editor);
    const args = isVi ? [`+${c.startLine}`, absPath] : [absPath];
    spawn(editor, args, { stdio: 'inherit', shell: true });
  } else {
    const codeProc = spawn('code', ['-g', `${absPath}:${c.startLine}`], { stdio: 'ignore', shell: true });
    codeProc.on('error', () => {
      spawn('open', [absPath], { stdio: 'ignore', shell: true });
    });
  }
}

// ── popup action type ────────────────────────────────────────────

type PopupAction = {
  key: string;
  label: string;
  action: () => void;
};

const AppInner: React.FC = () => {
  const state = useTuiStore();
  const { stdout } = useStdout();
  const queryClient = useQueryClient();
  const { isFocused } = useFocus();

  // ── data ─────────────────────────────────────────────────────────

  const { data: comments = [] } = useQueryComments();

  const resolveMutation = useMutateResolveComment();
  const unresolveMutation = useMutateUnresolveComment();
  const setStatusMutation = useMutateSetStatus();
  const deleteMutation = useMutateDeleteComment();

  // ── sync comment count ───────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = comments;
    if (!state.showResolved) {
      result = result.filter((c) => c.status !== CommentStatus.Resolved);
    }
    if (state.filter) {
      const f = state.filter.toLowerCase();
      result = result.filter(
        (c) => c.file.toLowerCase().includes(f) || c.message.toLowerCase().includes(f),
      );
    }
    return result;
  }, [comments, state.filter, state.showResolved]);

  useEffect(() => {
    tuiStore.dispatch({ type: 'tui/setCommentCount', count: filtered.length });
  }, [filtered.length]);

  // ── invalidate on focus ──────────────────────────────────────────

  useEffect(() => {
    if (isFocused) {
      void queryClient.invalidateQueries({ queryKey: ['comments'] });
    }
  }, [isFocused, queryClient]);

  // ── layout ───────────────────────────────────────────────────────

  const termRows = stdout?.rows ?? 24;
  const termCols = stdout?.columns ?? 80;
  const popupHeight = 8;
  const headerHeight = 2;
  const footerHeight = state.mode === 'filter' ? 3 : state.mode === 'popup' ? popupHeight : 0;
  const maxVisible = Math.max(1, termRows - headerHeight - footerHeight);

  const clampedIndex = Math.min(state.selectedIndex, Math.max(0, filtered.length - 1));
  const startIdx = Math.max(0, clampedIndex - Math.floor(maxVisible / 2));
  const endIdx = Math.min(filtered.length, startIdx + maxVisible);
  const visibleComments = filtered.slice(startIdx, endIdx);

  const prefixWidth = 12;
  const fileColMax = Math.min(30, Math.floor(termCols * 0.32));
  const msgColMax = Math.max(10, termCols - prefixWidth - fileColMax - 2);

  // ── selected comment / popup actions ─────────────────────────────

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
        key: 'y',
        label: 'Copy ID',
        action: () => {
          process.stdout.write(shortId);
        },
      },
      {
        key: 'd',
        label: 'Delete',
        action: () => {
          deleteMutation.mutate(shortId);
        },
      },
    ];
  }, [selectedComment, resolveMutation, unresolveMutation, setStatusMutation, deleteMutation]);

  // ── keyboard ─────────────────────────────────────────────────────

  useInput((input, key) => {
    // Side-effect keys in normal mode
    if (state.mode === 'normal') {
      if (input === 'r') {
        void queryClient.invalidateQueries({ queryKey: ['comments'] });
        return;
      }
      if (input === 'e') {
        if (selectedComment) openInEditor(selectedComment);
        return;
      }
      if (input === 'q' || input === 'Q') {
        process.exit(0);
        return;
      }
    }

    // Side-effect keys in popup mode
    if (state.mode === 'popup') {
      if (key.return) {
        const action = popupActions[state.popupIndex];
        if (action) {
          action.action();
          tuiStore.dispatch({ type: 'tui/key', input: '', key: { escape: true } }); // close popup
        }
        return;
      }
      // Direct key press for any popup action
      const match = popupActions.find((a) => a.key === input);
      if (match) {
        match.action();
        if (match.key !== 'e' && match.key !== 'y') {
          tuiStore.dispatch({ type: 'tui/key', input: '', key: { escape: true } });
        }
        return;
      }
    }

    // Dispatch all other keys to the store
    tuiStore.dispatch({ type: 'tui/key', input, key: {
      upArrow: key.upArrow,
      downArrow: key.downArrow,
      return: key.return,
      escape: key.escape,
      backspace: key.backspace,
      delete: key.delete,
      ctrl: key.ctrl,
      meta: key.meta,
      tab: key.tab,
    } });
  });

  // ── render ───────────────────────────────────────────────────────

  const repoRoot = useMemo(() => getRepoRoot(), []);

  const showScrollTop = startIdx > 0;
  const showScrollBottom = endIdx < filtered.length;

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* title */}
      <Box>
        <Text bold>agent-comments</Text>
        <Text dimColor>  {repoRoot}</Text>
        <Text dimColor>  {filtered.length} comment{filtered.length !== 1 ? 's' : ''}</Text>
        <Text dimColor>  [? actions]</Text>
        {state.filter ? <Text color="yellow">  filter: "{state.filter}"</Text> : null}
        {!state.showResolved && <Text color="yellow">  hiding resolved</Text>}
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
            {state.filter || !state.showResolved ? '  No matching comments' : '  No comments yet'}
          </Text>
        </Box>
      )}

      {showScrollBottom && (
        <Box>
          <Text dimColor>{' '.repeat(prefixWidth)}▼ more below</Text>
        </Box>
      )}

      {/* footer: filter mode */}
      {state.mode === 'filter' && (
        <Box marginTop={1} flexDirection="column">
          <Text>
            Filter: <Text color="yellow">{state.filterInput}</Text>
            <Text dimColor>█</Text>
          </Text>
          <Text dimColor>  Enter apply  |  Esc cancel</Text>
        </Box>
      )}

      {/* footer: popup */}
      {state.mode === 'popup' && selectedComment && (
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
              <Text inverse={i === state.popupIndex} color={i === state.popupIndex ? undefined : 'cyan'}>
                {i === state.popupIndex ? '▶' : ' '} [{a.key}] {a.label}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      </Box>
  );
};

const App: React.FC = () => (
  <GlobalProviders>
    <AppInner />
  </GlobalProviders>
);

export default App;