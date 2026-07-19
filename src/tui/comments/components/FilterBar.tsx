import React from 'react';
import { Box, Text } from 'ink';

type FilterBarProps = {
  filter: string;
};

export const FilterBar: React.FC<FilterBarProps> = ({ filter }) => {
  return (
    <Box marginTop={1} flexDirection="column">
      <Text>
        Filter: <Text color="yellow">{filter}</Text>
        <Text dimColor>█</Text>
      </Text>
      <Text dimColor>  Enter apply  |  Esc cancel</Text>
    </Box>
  );
};