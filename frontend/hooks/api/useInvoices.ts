import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { invoiceApi } from "@/lib/api";
import type { Invoice, InvoiceCreate, InvoiceUpdate, InvoiceStats } from "@/lib/types";
import { toast } from "sonner";

// Query keys for consistent cache management
export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (filters: {
    page?: number;
    pageSize?: number;
    status?: string;
    client_id?: string;
    start_date?: string;
    end_date?: string;
  }) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, "detail"] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  stats: () => [...invoiceKeys.all, "stats"] as const,
};

/**
 * Hook to fetch invoice statistics
 * Shared cache key with dashboard and invoices page
 */
export function useInvoiceStats() {
  return useQuery({
    queryKey: invoiceKeys.stats(),
    queryFn: () => invoiceApi.getStats(),
  });
}

/**
 * Hook to fetch paginated list of invoices with filters
 */
export function useInvoices(
  page: number = 1,
  pageSize: number = 10,
  filters?: {
    status?: string;
    client_id?: string;
    start_date?: string;
    end_date?: string;
  }
) {
  return useQuery({
    queryKey: invoiceKeys.list({ page, pageSize, ...filters }),
    queryFn: () => invoiceApi.list(page, pageSize, filters),
  });
}

/**
 * Hook to fetch a single invoice by ID
 */
export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => invoiceApi.get(id),
    enabled: !!id,
  });
}

/**
 * Hook for infinite scroll of invoices
 * Loads pages as user scrolls
 */
export function useInfiniteInvoices(
  pageSize: number = 10,
  filters?: {
    status?: string;
    client_id?: string;
    start_date?: string;
    end_date?: string;
  }
) {
  return useInfiniteQuery({
    queryKey: invoiceKeys.list({ pageSize, ...filters }),
    queryFn: ({ pageParam = 1 }) => invoiceApi.list(pageParam, pageSize, filters),
    getNextPageParam: (lastPage, allPages) => {
      // If current page has full pageSize items, there might be more
      if (lastPage.invoices.length === pageSize) {
        return allPages.length + 1;
      }
      return undefined; // No more pages
    },
    initialPageParam: 1,
  });
}

/**
 * Hook for invoice mutations (create, update, delete, status change)
 */
export function useInvoiceMutations() {
  const queryClient = useQueryClient();

  const createInvoice = useMutation({
    mutationFn: (data: InvoiceCreate) => invoiceApi.create(data),
    onSuccess: () => {
      // Invalidate all invoice lists and stats
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      toast.success("Invoice created successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to create invoice";
      toast.error(message);
    },
  });

  const updateInvoice = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceUpdate }) =>
      invoiceApi.update(id, data),
    onSuccess: (updatedInvoice) => {
      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      // Update the specific invoice in cache
      queryClient.setQueryData(
        invoiceKeys.detail(updatedInvoice.id),
        updatedInvoice
      );
      toast.success("Invoice updated successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to update invoice";
      toast.error(message);
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: (id: string) => invoiceApi.delete(id),
    onSuccess: () => {
      // Invalidate all lists and stats
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      toast.success("Invoice deleted successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to delete invoice";
      toast.error(message);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
    }) => invoiceApi.updateStatus(id, status),
    // Optimistic update for instant UI feedback
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: invoiceKeys.detail(id) });

      // Snapshot the previous value
      const previousInvoice = queryClient.getQueryData(invoiceKeys.detail(id));

      // Optimistically update the invoice status
      queryClient.setQueryData(invoiceKeys.detail(id), (old: any) => {
        if (!old) return old;
        return { ...old, status };
      });

      // Return context for rollback on error
      return { previousInvoice };
    },
    onSuccess: (updatedInvoice) => {
      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      // Update with actual server data
      queryClient.setQueryData(
        invoiceKeys.detail(updatedInvoice.id),
        updatedInvoice
      );
      toast.success("Invoice status updated successfully");
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousInvoice) {
        queryClient.setQueryData(
          invoiceKeys.detail(variables.id),
          context.previousInvoice
        );
      }
      const message = error?.response?.data?.detail || "Failed to update status";
      toast.error(message);
    },
  });

  const sendEmail = useMutation({
    mutationFn: ({
      id,
      message,
      template,
    }: {
      id: string;
      message?: string;
      template?: string;
    }) => invoiceApi.sendEmail(id, message, template),
    onSuccess: (updatedInvoice) => {
      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      // Update the specific invoice in cache
      queryClient.setQueryData(
        invoiceKeys.detail(updatedInvoice.id),
        updatedInvoice
      );
      toast.success("Invoice sent successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to send invoice";
      toast.error(message);
    },
  });

  return {
    createInvoice,
    updateInvoice,
    deleteInvoice,
    updateStatus,
    sendEmail,
  };
}
