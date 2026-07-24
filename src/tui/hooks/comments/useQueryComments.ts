import { useQuery } from '@tanstack/react-query';
import { commentService } from '../../../comments/service.ts';
import type { CommentEntity, CommentStatus } from '../../../comments/comments.domain.ts';

export function useQueryComments(options?: { status?: CommentStatus; includeGitRemote?: string }) {
  return useQuery<CommentEntity[]>({
    queryKey: ['comments', options],
    queryFn: () => commentService.getAllComments(options ?? {}),
  });
}