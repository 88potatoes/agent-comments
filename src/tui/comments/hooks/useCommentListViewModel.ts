import { useMemo } from 'react';
import type { CommentEntity } from '../../../comments/comments.domain.ts';
import type { CommentListViewModel } from '../view-model.ts';
import { useTuiStore } from '../../store.ts';
import { toCommentListViewModel } from '../logic.ts';
import { useQueryComments } from '../../hooks/comments/useQueryComments.ts';

export function useCommentListViewModel(): {
  vm: CommentListViewModel;
  comments: CommentEntity[];
} {
  const state = useTuiStore();
  const { data: comments = [] } = useQueryComments();

  const vm = useMemo(
    () => toCommentListViewModel(comments, state),
    [comments, state],
  );

  return { vm, comments };
}