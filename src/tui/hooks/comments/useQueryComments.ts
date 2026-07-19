import { useQuery } from '@tanstack/react-query';
import { commentService } from '../../../comments/service.ts';
import type { CommentEntity } from '../../../comments/comments.domain.ts';

export function useQueryComments() {
  return useQuery<CommentEntity[]>({
    queryKey: ['comments'],
    queryFn: () => commentService.getAllComments(),
  });
}