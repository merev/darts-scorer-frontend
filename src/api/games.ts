import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Game, GameConfig, GameState } from '../types/darts';

export interface CreateGamePayload {
  config: GameConfig;
  playerIds: string[];
}

export function useGame(gameId: string) {
  return useQuery<GameState>({
    queryKey: ['game', gameId],
    queryFn: async () => {
      const res = await apiClient.get<GameState>(`/games/${gameId}`);
      return res.data;
    },
    enabled: !!gameId
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateGamePayload) => {
      const res = await apiClient.post<Game>('/games', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    }
  });
}

export function usePostThrow(gameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { playerId: string; visitScore: number; dartsThrown: number }) => {
      const res = await apiClient.post<GameState>(`/games/${gameId}/throws`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    }
  });
}
