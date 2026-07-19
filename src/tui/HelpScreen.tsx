import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { InputMode } from './store.ts';

type KeymapEntry = {
  keys: string;
  description: string;
};

const globalKeymaps: KeymapEntry[] = [
  { keys: '?', description: 'Toggle help' },
  { keys: 'q', description: 'Quit' },
];

const localKeymaps: Record<InputMode, KeymapEntry[]> = {
  list: [
    { keys: 'j / ↓', description: 'Move down' },
    { keys: 'k / ↑', description: 'Move up' },
    { keys: 'r', description: 'Refresh comments' },
    { keys: 'R', description: 'Toggle resolved visibility' },
    { keys: 'e', description: 'Open in editor' },
    { keys: '/', description: 'Filter comments' },
    { keys: 'Esc', description: 'Clear filter' },
  ],
  'list-filter': [
    { keys: 'type', description: 'Enter filter text' },
    { keys: 'Enter', description: 'Apply filter' },
    { keys: 'Esc', description: 'Cancel filter' },
  ],
  help: [],
};

function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

const modeLabels: Record<InputMode, string> = {
  list: 'List',
  'list-filter': 'Filter',
  help: 'Help',
};

interface HelpScreenProps {
  mode: InputMode;
  onClose: () => void;
}

export const HelpScreen: React.FC<HelpScreenProps> = ({ mode, onClose }) => {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  const locals = localKeymaps[mode];

  const filteredLocal = useMemo(() => {
    if (!search) return locals;
    return locals.filter(
      (k) => fuzzyMatch(search, k.keys) || fuzzyMatch(search, k.description),
    );
  }, [search, locals]);

  const filteredGlobal = useMemo(() => {
    if (!search) return globalKeymaps;
    return globalKeymaps.filter(
      (k) => fuzzyMatch(search, k.keys) || fuzzyMatch(search, k.description),
    );
  }, [search]);

  const totalMatches = filteredLocal.length + filteredGlobal.length;

  useInput((input, key) => {
    if (searching) {
      if (key.escape) {
        setSearching(false);
        setSearch('');
      } else if (key.return) {
        setSearching(false);
      } else if (key.backspace || key.delete) {
        setSearch((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta && !key.tab) {
        setSearch((prev) => prev + input);
      }
      return;
    }

    if (key.escape || input === 'q' || input === '?') {
      onClose();
    } else if (input === '/') {
      setSearching(true);
      setSearch('');
    }
  });

  const keysWidth = 18;

  const renderSection = (title: string, entries: KeymapEntry[]) => {
    if (entries.length === 0) return null;
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text bold>{title}</Text>
        {entries.map((k) => (
          <Box key={k.keys}>
            <Text>{k.keys.padEnd(keysWidth)}</Text>
            <Text dimColor>{k.description}</Text>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text bold>Help</Text>
        <Text dimColor>  press / to search, ? or Esc to close</Text>
      </Box>
      {searching && (
        <Box>
          <Text>
            Search: <Text color="yellow">{search}</Text>
            <Text dimColor>█</Text>
          </Text>
          <Text dimColor>  ({totalMatches} match{totalMatches !== 1 ? 'es' : ''})</Text>
        </Box>
      )}
      {renderSection(`Local — ${modeLabels[mode]}`, filteredLocal)}
      {renderSection('Global', filteredGlobal)}
      {totalMatches === 0 && (
        <Box>
          <Text dimColor>  No matching keymaps</Text>
        </Box>
      )}
    </Box>
  );
};