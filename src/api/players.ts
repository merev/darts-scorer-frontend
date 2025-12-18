// src/api/players.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { Player } from '../types/darts';

export function usePlayers() {
  return useQuery<Player[]>({
    queryKey: ['players'],
    queryFn: async () => {
      const res = await axios.get('/api/players');
      return res.data ?? [];
    },
  });
}

interface CreatePlayerPayload {
  name: string;
  avatarData?: string; // NEW
}

export function useCreatePlayer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePlayerPayload) => {
      const res = await axios.post('/api/players', payload);
      return res.data as Player;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['players'] });
    },
  });
}
