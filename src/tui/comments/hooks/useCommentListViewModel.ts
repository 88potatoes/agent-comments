import { useMemo } from 'react';
import { CommentStatus } from '../../../comments/comments.domain.ts';
import type { CommentListViewModel } from '../view-model.ts';
import { useTuiStore } from '../../store.ts';
import { toCommentListViewModel } from '../logic.ts';
import { useQueryComments } from '../../hooks/comments/useQueryComments.ts';

/** Returns the view model for the comment list. Does NOT expose CommentEntity. */
export function useCommentListViewModel(): { vm: CommentListViewModel } {
  const state = useTuiStore();
  const filter = useMemo<Parameters<typeof useQueryComments>[0]>(
    () => ({
      status: state.showResolved ? undefined : CommentStatus.Active,
    }),
    [state.showResolved],
  );
  const { data: comments = [] } = useQueryComments(filter);

  const vm = useMemo(
    () => toCommentListViewModel(comments, state),
    [comments, state],
  );

  return { vm };
}