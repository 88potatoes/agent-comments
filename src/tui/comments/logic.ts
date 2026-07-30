// ── Logic Layer ─────────────────────────────────────────────────
// Pure functions. No React, no mutations, no side effects.
// Input: domain entities + client state
// Output: view models (server state + client state merged, no layout)

import Fuse from 'fuse.js';
import { CommentSource, CommentStatus } from '../../comments/comments.domain.ts';
import type { CommentEntity } from '../../comments/comments.domain.ts';
import type { TuiState } from '../store.ts';
import { statusIcon, statusColor } from '../helpers.tsx';
import type {
  CommentRowViewModel,
  CommentListViewModel,
} from './view-model.ts';

// ── fuzzy filter ───────────────────────────────────────────────

const fuseOptions: Fuse.IFuseOptions<CommentEntity> = {
  keys: ['file', 'message'],
  threshold: 0.4,
  includeScore: true,
};

function fuzzyFilter(comments: CommentEntity[], query: string): CommentEntity[] {
  if (!query) return comments;
  const fuse = new Fuse(comments, fuseOptions);
  return fuse.search(query).map((r) => r.item);
}

// ── filtering ──────────────────────────────────────────────────

export function filterComments(
  comments: CommentEntity[],
  filter: string,
  showResolved: boolean,
  showGitHub: boolean,
): CommentEntity[] {
  let result = fuzzyFilter(comments, filter);
  if (!showResolved) {
    result = result.filter((c) => c.status !== CommentStatus.Resolved);
  }
  if (!showGitHub) {
    result = result.filter((c) => c.source !== CommentSource.GitHub);
  }
  return result;
}

// ── single row ─────────────────────────────────────────────────

export function toCommentRowViewModel(
  comment: CommentEntity,
  isSelected: boolean,
): CommentRowViewModel {
  return {
    id: comment.id,
    shortId: comment.id.slice(0, 8),
    icon: statusIcon(comment.status),
    iconColor: statusColor(comment.status),
    file: comment.file,
    message: comment.message,
    startLine: comment.startLine,
    endLine: comment.endLine,
    isSelected,
    isResolved: comment.status === CommentStatus.Resolved,
  };
}


// ── whole list ─────────────────────────────────────────────────

export function toCommentListViewModel(
  comments: CommentEntity[],
  state: TuiState,
): CommentListViewModel {
  const filtered = filterComments(comments, state.filter, state.showResolved, state.showGitHub);

  // rows — all filtered, with selection marker (clamped both sides)
  const clampedIndex = Math.max(0, Math.min(state.hoveredCommentIndex, Math.max(0, filtered.length - 1)));
  const rows: CommentRowViewModel[] = filtered.map((c, i) =>
    toCommentRowViewModel(c, i === clampedIndex),
  );

  return {
    totalCount: filtered.length,
    filter: state.filter,
    showResolved: state.showResolved,
    showGitHub: state.showGitHub,
    isFilterMode: state.inputMode === 'list-filter',
    rows,
  };
}
