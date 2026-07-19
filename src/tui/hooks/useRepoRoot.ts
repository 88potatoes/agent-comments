import { useMemo } from 'react';
import { getRepoRoot } from '../../lib/db.ts';

export function useRepoRoot(): string {
  return useMemo(() => getRepoRoot(), []);
}