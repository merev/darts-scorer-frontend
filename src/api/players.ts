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

export function usePlayers() {
  return useQuery<Player[]>({
    queryKey: ['players'],
    queryFn: async () => {
      const res = await apiClient.get<Player[]>('/players');
      return res.data ?? [];
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

export function useUpdatePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePlayerPayload) => {
      const { id, ...body } = payload;
      const res = await apiClient.put<Player>(`/players/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}

export function useDeletePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/players/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
}
