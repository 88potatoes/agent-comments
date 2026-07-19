import React from 'react';
import { Box, Text } from 'ink';
import type { FilterBarViewModel } from '../view-model.ts';

type FilterBarProps = {
  filterBar: FilterBarViewModel;
};

export const FilterBar: React.FC<FilterBarProps> = ({ filterBar }) => {
  return (
    <Box marginTop={1} flexDirection="column">
      <Text>
        Filter: <Text color="yellow">{filterBar.filterInput}</Text>
        <Text dimColor>█</Text>
      </Text>
      <Text dimColor>  Enter apply  |  Esc cancel</Text>
    </Box>
  );
};