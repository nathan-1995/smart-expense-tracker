import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientApi } from "@/lib/api";
import type { Client, ClientCreate, ClientUpdate } from "@/lib/types";
import { toast } from "sonner";

export const clientKeys = {
  all: ["clients"] as const,
  lists: () => [...clientKeys.all, "list"] as const,
  list: (filters: { page?: number; pageSize?: number; isActive?: boolean }) =>
    [...clientKeys.lists(), filters] as const,
  details: () => [...clientKeys.all, "detail"] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
};

export function useClients(
  page: number = 1,
  pageSize: number = 50,
  isActive?: boolean
) {
  return useQuery({
    queryKey: clientKeys.list({ page, pageSize, isActive }),
    queryFn: () => clientApi.list(page, pageSize, isActive),
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => clientApi.get(id),
    enabled: !!id,
  });
}

export function useClientMutations() {
  const queryClient = useQueryClient();

  const createClient = useMutation({
    mutationFn: (data: ClientCreate) => clientApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      toast.success("Client created successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to create client";
      toast.error(message);
    },
  });

  const updateClient = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientUpdate }) =>
      clientApi.update(id, data),
    onSuccess: (updatedClient) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.setQueryData(clientKeys.detail(updatedClient.id), updatedClient);
      toast.success("Client updated successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to update client";
      toast.error(message);
    },
  });

  const deleteClient = useMutation({
    mutationFn: (id: string) => clientApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      toast.success("Client deleted successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to delete client";
      toast.error(message);
    },
  });

  const deactivateClient = useMutation({
    mutationFn: (id: string) => clientApi.deactivate(id),
    onSuccess: (updatedClient) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.setQueryData(clientKeys.detail(updatedClient.id), updatedClient);
      toast.success("Client deactivated successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to deactivate client";
      toast.error(message);
    },
  });

  return {
    createClient,
    updateClient,
    deleteClient,
    deactivateClient,
  };
}
