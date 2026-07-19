import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

type KeymapEntry = {
  keys: string;
  description: string;
};

const keymaps: KeymapEntry[] = [
  // Normal mode
  { keys: 'j / ↓', description: 'Move down' },
  { keys: 'k / ↑', description: 'Move up' },
  { keys: 'r', description: 'Refresh comments' },
  { keys: 'R', description: 'Toggle resolved visibility' },
  { keys: 'e', description: 'Open in editor' },
  { keys: 'Enter', description: 'Open actions popup' },
  { keys: '/', description: 'Filter comments' },
  { keys: '?', description: 'Toggle help' },
  { keys: 'Esc', description: 'Clear filter' },
  { keys: 'q', description: 'Quit' },
  // Filter mode
  { keys: '(filter) type', description: 'Enter filter text' },
  { keys: '(filter) Enter', description: 'Apply filter' },
  { keys: '(filter) Esc', description: 'Cancel filter' },
  // Popup mode
  { keys: '(popup) j / ↓', description: 'Move down actions' },
  { keys: '(popup) k / ↑', description: 'Move up actions' },
  { keys: '(popup) Enter', description: 'Select action' },
  { keys: '(popup) q / Esc', description: 'Close popup' },
  { keys: '(popup) r', description: 'Resolve / Activate' },
  { keys: '(popup) u', description: 'Unresolve' },
  { keys: '(popup) e', description: 'Open in editor' },
  { keys: '(popup) y', description: 'Copy ID' },
];

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

interface HelpScreenProps {
  onClose: () => void;
}

export const HelpScreen: React.FC<HelpScreenProps> = ({ onClose }) => {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return keymaps;
    return keymaps.filter(
      (k) =>
        fuzzyMatch(search, k.keys) ||
        fuzzyMatch(search, k.description),
    );
  }, [search]);

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
          <Text dimColor>  ({filtered.length} match{filtered.length !== 1 ? 'es' : ''})</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          {'KEY'.padEnd(keysWidth)}DESCRIPTION
        </Text>
      </Box>
      {filtered.map((k) => (
        <Box key={k.keys}>
          <Text>{k.keys.padEnd(keysWidth)}</Text>
          <Text dimColor>{k.description}</Text>
        </Box>
      ))}
      {filtered.length === 0 && (
        <Box>
          <Text dimColor>  No matching keymaps</Text>
        </Box>
      )}
    </Box>
  );
};