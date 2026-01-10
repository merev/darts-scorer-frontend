import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Game } from '../types/darts';

export function useStatsGames(limit = 50) {
  return useQuery<Game[]>({
    queryKey: ['stats-games', limit],
    queryFn: async () => {
      const res = await apiClient.get<Game[]>('/stats/games', {
        params: { limit },
      });
      return res.data;
    },
  });
}
