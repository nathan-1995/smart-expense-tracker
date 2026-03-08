import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bankAccountApi } from "@/lib/api";
import type { BankAccount, BankAccountCreate, BankAccountUpdate, Currency } from "@/lib/types";
import { toast } from "sonner";

export const bankAccountKeys = {
  all: ["bankAccounts"] as const,
  lists: () => [...bankAccountKeys.all, "list"] as const,
  list: (filters: { page?: number; page_size?: number; is_active?: boolean; currency?: Currency }) =>
    [...bankAccountKeys.lists(), filters] as const,
  active: () => [...bankAccountKeys.all, "active"] as const,
  details: () => [...bankAccountKeys.all, "detail"] as const,
  detail: (id: string) => [...bankAccountKeys.details(), id] as const,
};

export function useBankAccounts(filters?: {
  page?: number;
  page_size?: number;
  is_active?: boolean;
  currency?: Currency;
}) {
  return useQuery({
    queryKey: bankAccountKeys.list(filters || {}),
    queryFn: () => bankAccountApi.getBankAccounts(filters),
  });
}

export function useActiveBankAccounts() {
  return useQuery({
    queryKey: bankAccountKeys.active(),
    queryFn: () => bankAccountApi.getActiveBankAccounts(),
  });
}

export function useBankAccount(id: string) {
  return useQuery({
    queryKey: bankAccountKeys.detail(id),
    queryFn: () => bankAccountApi.getBankAccount(id),
    enabled: !!id,
  });
}

export function useBankAccountMutations() {
  const queryClient = useQueryClient();

  const createBankAccount = useMutation({
    mutationFn: (data: BankAccountCreate) => bankAccountApi.createBankAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.active() });
      toast.success("Bank account created successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to create bank account";
      toast.error(message);
    },
  });

  const updateBankAccount = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BankAccountUpdate }) =>
      bankAccountApi.updateBankAccount(id, data),
    onSuccess: (updatedAccount) => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.active() });
      queryClient.setQueryData(bankAccountKeys.detail(updatedAccount.id), updatedAccount);
      toast.success("Bank account updated successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to update bank account";
      toast.error(message);
    },
  });

  const deleteBankAccount = useMutation({
    mutationFn: (id: string) => bankAccountApi.deleteBankAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.active() });
      toast.success("Bank account deleted successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to delete bank account";
      toast.error(message);
    },
  });

  const deactivateBankAccount = useMutation({
    mutationFn: (id: string) => bankAccountApi.deactivateBankAccount(id),
    onSuccess: (updatedAccount) => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.active() });
      queryClient.setQueryData(bankAccountKeys.detail(updatedAccount.id), updatedAccount);
      toast.success("Bank account deactivated successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to deactivate bank account";
      toast.error(message);
    },
  });

  return {
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    deactivateBankAccount,
  };
}
