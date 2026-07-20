import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { InputMode } from './store.ts';

// ── keymap entry ───────────────────────────────────────────────

export type KeymapEntry = {
  keys: string;
  description: string;
  /** The key to simulate when Enter is pressed on this row. Entry is only hoverable if set. */
  action?: string;
};

// ── global (always shown) ──────────────────────────────────────

const globalKeymaps: KeymapEntry[] = [
  { keys: '?', description: 'Toggle help', action: '?' },
  { keys: 'q', description: 'Quit', action: 'q' },
];

// ── context-aware local entries (pure function) ────────────────

export function buildLocalKeymaps(
  mode: InputMode,
  hasFilter: boolean,
  hasComments: boolean,
): KeymapEntry[] {
  if (mode === 'list-filter') {
    return [
      { keys: 'type', description: 'Enter filter text' },
      { keys: 'Enter', description: 'Apply filter', action: 'Enter' },
      { keys: 'Esc', description: 'Cancel filter', action: 'Esc' },
    ];
  }

  if (mode === 'help') return [];

  // list mode — only show actions valid right now
  const entries: KeymapEntry[] = [];

  entries.push({ keys: 'r', description: 'Refresh comments', action: 'r' });
  entries.push({ keys: 'R', description: 'Toggle resolved visibility', action: 'R' });

  if (hasComments) {
    entries.push({ keys: 'e', description: 'Open in editor', action: 'e' });
    entries.push({ keys: 'd', description: 'Delete comment', action: 'd' });
  }

  entries.push({ keys: '/', description: 'Filter comments', action: '/' });

  if (hasFilter) {
    entries.push({ keys: 'Esc', description: 'Clear filter', action: 'Esc' });
  }

  return entries;
}

// ── helpers ────────────────────────────────────────────────────

const modeLabels: Record<InputMode, string> = {
  list: 'List',
  'list-filter': 'Filter',
  help: 'Help',
};

// ── props ──────────────────────────────────────────────────────

export interface HelpScreenProps {
  mode: InputMode;
  hasFilter: boolean;
  hasComments: boolean;
  hoveredHelpIndex: number;
  onClose: () => void;
  onMoveUp: (totalEntries: number) => void;
  onMoveDown: (totalEntries: number) => void;
  onActivate: (actionKey: string) => void;
}

// ── component ──────────────────────────────────────────────────

export const HelpScreen: React.FC<HelpScreenProps> = ({
  mode,
  hasFilter,
  hasComments,
  hoveredHelpIndex,
  onClose,
  onMoveUp,
  onMoveDown,
  onActivate,
}) => {
  const locals = useMemo(
    () => buildLocalKeymaps(mode, hasFilter, hasComments),
    [mode, hasFilter, hasComments],
  );

  // flat list of all hoverable entries (locals with actions first, then globals)
  const allEntries = useMemo(() => {
    const hlocals = locals.filter((e) => e.action);
    return [...hlocals, ...globalKeymaps];
  }, [locals]);

  useInput((input, key) => {
    // close
    if (key.escape || input === 'q' || input === '?') {
      onClose();
      return;
    }

    // navigate
    if (key.upArrow || input === 'k') {
      onMoveUp(allEntries.length);
      return;
    }
    if (key.downArrow || input === 'j') {
      onMoveDown(allEntries.length);
      return;
    }

    // activate
    if (key.return) {
      const entry = allEntries[hoveredHelpIndex];
      if (entry?.action) {
        onActivate(entry.action);
      }
    }
  });

  const keysWidth = 18;

  const renderSection = (title: string, entries: KeymapEntry[], startIndex: number) => {
    if (entries.length === 0) return null;
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text bold>{title}</Text>
        {entries.map((k, i) => {
          const globalIdx = startIndex + i;
          const isHovered = globalIdx === hoveredHelpIndex && allEntries.length > 0;
          return (
            <Box key={k.keys}>
              <Text inverse={isHovered}>{k.keys.padEnd(keysWidth)}</Text>
              <Text inverse={isHovered} dimColor={!isHovered}>{k.description}</Text>
            </Box>
          );
        })}
      </Box>
    );
  };

  const hoverableLocals = locals.filter((e) => e.action);
  const hoverStart = 0;
  const globalStart = hoverableLocals.length;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text bold>Help</Text>
        <Text dimColor>  j/k navigate, Enter to activate, ?/Esc/q to close</Text>
      </Box>
      {renderSection(`Local — ${modeLabels[mode]}`, hoverableLocals, hoverStart)}
      {renderSection('Global', globalKeymaps, globalStart)}
    </Box>
  );
};