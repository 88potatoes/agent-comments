import { CommentStatus } from '../comments/comments.domain.ts';

export function truncateLeft(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return '\u2026' + str.slice(str.length - maxLen + 1);
}

export function truncateRight(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '\u2026';
}

export function statusIcon(status: CommentStatus): string {
  if (status === CommentStatus.Active) return '\u25cf'; // ●
  if (status === CommentStatus.Resolved) return '\u2713'; // ✓
  return '\u25cb'; // ○ draft
}

export function statusColor(status: CommentStatus): string {
  if (status === CommentStatus.Active) return 'yellow';
  if (status === CommentStatus.Resolved) return 'green';
  return 'gray';
}