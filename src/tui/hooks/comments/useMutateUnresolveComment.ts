import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commentService } from '../../../comments/service.ts';

export function useMutateUnresolveComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => commentService.unresolveComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  });
}