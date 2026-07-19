import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commentService } from '../../../comments/service.ts';

export function useMutateDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => commentService.deleteComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  });
}