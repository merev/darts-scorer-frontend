import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Player } from '../types/darts';

export interface CreatePlayerPayload {
  name: string;
}

export function usePlayers() {
  return useQuery<Player[]>({
    queryKey: ['players'],
    queryFn: async () => {
      const res = await apiClient.get<Player[]>('/players');
      return res.data;
    },
    retry: false,
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePlayerPayload) => {
      const res = await apiClient.post<Player>('/players', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}
