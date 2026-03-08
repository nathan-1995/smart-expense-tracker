import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionApi } from "@/lib/api";
import type { Transaction, TransactionCreate, TransactionUpdate, TransactionBulkImportRequest } from "@/lib/types";
import { toast } from "sonner";

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters: {
    page?: number;
    pageSize?: number;
    transaction_type?: string;
    category?: string;
    start_date?: string;
    end_date?: string;
    document_id?: string;
  }) => [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
  stats: () => [...transactionKeys.all, "stats"] as const,
};

export function useTransactions(filters?: {
  page?: number;
  page_size?: number;
  transaction_type?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  document_id?: string;
}) {
  return useQuery({
    queryKey: transactionKeys.list(filters || {}),
    queryFn: () => transactionApi.listTransactions(filters),
  });
}

export function useTransactionStats() {
  return useQuery({
    queryKey: transactionKeys.stats(),
    queryFn: () => transactionApi.getTransactionStats(),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => transactionApi.getTransaction(id),
    enabled: !!id,
  });
}

export function useTransactionMutations() {
  const queryClient = useQueryClient();

  const createTransaction = useMutation({
    mutationFn: (data: TransactionCreate) => transactionApi.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.stats() });
      toast.success("Transaction created successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to create transaction";
      toast.error(message);
    },
  });

  const bulkImport = useMutation({
    mutationFn: ({ documentId, data }: { documentId: string; data: TransactionBulkImportRequest }) =>
      transactionApi.bulkImportTransactions(documentId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.stats() });
      toast.success(`Successfully imported ${result.count} transactions`);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to import transactions";
      toast.error(message);
    },
  });

  const updateTransaction = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionUpdate }) =>
      transactionApi.updateTransaction(id, data),
    onSuccess: (updatedTransaction) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.stats() });
      queryClient.setQueryData(transactionKeys.detail(updatedTransaction.id), updatedTransaction);
      toast.success("Transaction updated successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to update transaction";
      toast.error(message);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: (id: string) => transactionApi.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.stats() });
      toast.success("Transaction deleted successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to delete transaction";
      toast.error(message);
    },
  });

  return {
    createTransaction,
    bulkImport,
    updateTransaction,
    deleteTransaction,
  };
}
