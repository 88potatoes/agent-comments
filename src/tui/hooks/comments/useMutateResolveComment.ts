import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commentService } from '../../../comments/service.ts';

export function useMutateResolveComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => commentService.resolveComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  });
}