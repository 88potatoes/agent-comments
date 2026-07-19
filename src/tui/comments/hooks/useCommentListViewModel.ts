import { useMemo } from 'react';
import type { CommentListViewModel } from '../view-model.ts';
import { useTuiStore } from '../../store.ts';
import { toCommentListViewModel } from '../logic.ts';
import { useQueryComments } from '../../hooks/comments/useQueryComments.ts';

/** Returns the view model for the comment list. Does NOT expose CommentEntity. */
export function useCommentListViewModel(): { vm: CommentListViewModel } {
  const state = useTuiStore();
  const { data: comments = [] } = useQueryComments();

  const vm = useMemo(
    () => toCommentListViewModel(comments, state),
    [comments, state],
  );

  return { vm };
}