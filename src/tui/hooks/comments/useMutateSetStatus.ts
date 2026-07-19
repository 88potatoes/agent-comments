import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CommentStatus } from '../../../comments/comments.domain.ts';
import { commentService } from '../../../comments/service.ts';

export function useMutateSetStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CommentStatus }) =>
      commentService.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  });
}