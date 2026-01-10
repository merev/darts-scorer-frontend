import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Game } from '../types/darts';

// --------------------
// Existing: game history stats
// --------------------

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

// --------------------
// Player stats
// --------------------

export interface PlayerStats {
  playerId: string;
  playerName: string;

  matchesPlayed: number;
  matchesWon: number;

  averageScore: number;
  bestCheckout?: number;

  // These will be filled later when stats-api is extended
  // first9Avg?: number;
  // checkoutPct?: number;
  // highScore?: number;
  // scoreBuckets?: Record<string, number>;
}

// Single player (useful for detail views)
export function useStatsPlayer(playerId?: string) {
  return useQuery<PlayerStats>({
    queryKey: ['stats-player', playerId],
    enabled: !!playerId,
    queryFn: async () => {
      const res = await apiClient.get<PlayerStats>(
        `/stats/players/${playerId}`
      );
      return res.data;
    },
  });
}

// Multiple players (used by the new stats page)
export function useStatsPlayers(playerIds: string[]) {
  return useQuery<PlayerStats[]>({
    queryKey: ['stats-players', playerIds],
    enabled: playerIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        playerIds.map((id) =>
          apiClient
            .get<PlayerStats>(`/stats/players/${id}`)
            .then((r) => r.data)
        )
      );
      return results;
    },
  });
}
