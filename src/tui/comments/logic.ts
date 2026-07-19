// ── Logic Layer ─────────────────────────────────────────────────
// Pure functions. No React, no mutations, no side effects.
// Input: domain entities + client state
// Output: view models (server state + client state merged, no layout)

import Fuse from 'fuse.js';
import { CommentStatus } from '../../comments/comments.domain.ts';
import type { CommentEntity } from '../../comments/comments.domain.ts';
import type { TuiState } from '../store.ts';
import { statusIcon, statusColor } from '../helpers.tsx';
import type {
  CommentRowViewModel,
  CommentListViewModel,
  FilterBarViewModel,
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
): CommentEntity[] {
  let result = fuzzyFilter(comments, filter);
  if (!showResolved) {
    result = result.filter((c) => c.status !== CommentStatus.Resolved);
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

// ── popup actions (commented out for now) ──────────────────────
/*
export function getPopupActionDescriptors(
  comment: CommentEntity,
): PopupActionViewModel[] {
  const canResolve = comment.status === CommentStatus.Active || comment.status === CommentStatus.Draft;
  const canUnresolve = comment.status === CommentStatus.Resolved;

  const actions: PopupActionViewModel[] = [];
  if (canResolve) {
    actions.push({
      key: 'r',
      label: comment.status === CommentStatus.Draft ? 'Activate (draft → active)' : 'Resolve',
    });
  }
  if (canUnresolve) {
    actions.push({ key: 'u', label: 'Unresolve' });
  }
  actions.push({ key: 'e', label: 'Open in editor' });
  actions.push({ key: 'y', label: 'Copy ID' });
  actions.push({ key: 'd', label: 'Delete' });
  return actions;
}
*/

// ── whole list ─────────────────────────────────────────────────

export function toCommentListViewModel(
  comments: CommentEntity[],
  state: TuiState,
  repoRoot: string,
): CommentListViewModel {
  const filtered = filterComments(comments, state.filter, state.showResolved);

  // rows — all filtered, with selection marker
  const clampedIndex = Math.min(state.selectedIndex, Math.max(0, filtered.length - 1));
  const rows: CommentRowViewModel[] = filtered.map((c, i) =>
    toCommentRowViewModel(c, i === clampedIndex),
  );

  // popup (commented out for now)
  const popup = null;
  /*
  let popup: CommentPopupViewModel | null = null;
  if (state.mode === 'popup' && filtered.length > 0) {
    const selected = filtered[clampedIndex];
    popup = {
      comment: toCommentRowViewModel(selected, false),
      actions: getPopupActionDescriptors(selected),
      selectedActionIndex: state.popupIndex,
    };
  }
  */

  // filter bar
  let filterBar: FilterBarViewModel | null = null;
  if (state.mode === 'filter') {
    filterBar = { filterInput: state.filterInput };
  }

  return {
    repoRoot,
    totalCount: filtered.length,
    filter: state.filter,
    showResolved: state.showResolved,
    rows,
    popup,
    filterBar,
  };
}