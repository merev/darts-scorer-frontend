import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Player } from '../types/darts';

export interface CreatePlayerPayload {
  name: string;
  avatarData?: string; // optional base64 data URL
}

export interface UpdatePlayerPayload {
  id: string;
  name: string;
  avatarData?: string | null; // null to clear, undefined to keep unchanged
}

// --------------------
// Queries
// --------------------

export function usePlayers() {
  return useQuery<Player[]>({
    queryKey: ['players'],
    queryFn: async () => {
      const res = await apiClient.get<Player[]>('/players');
      return res.data;
    },
  });
}

// --------------------
// Mutations
// --------------------

export function useCreatePlayer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePlayerPayload) => {
      const res = await apiClient.post<Player>('/players', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['players'] });
    },
  });
}

export function useUpdatePlayer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdatePlayerPayload) => {
      const res = await apiClient.put<Player>(`/players/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['players'] });
    },
  });
}

export function useDeletePlayer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/players/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['players'] });
    },
  });
}
