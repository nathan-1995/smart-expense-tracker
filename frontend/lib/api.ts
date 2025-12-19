import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  User,
  LoginRequest,
  RegisterRequest,
  Token,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserUpdate,
  ChangePasswordRequest,
  ApiError,
  Client,
  ClientCreate,
  ClientUpdate,
  ClientListResponse,
  Invoice,
  InvoiceCreate,
  InvoiceUpdate,
  InvoiceListResponse,
  InvoiceStats,
  AdminUser,
  AdminUserUpdate,
  AdminUserListResponse,
  AdminStatistics,
  SystemBanner,
  SystemBannerCreate,
  SystemBannerUpdate,
  SystemBannerListResponse,
  Document,
  DocumentListResponse,
  DocumentExtractionResult,
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  TransactionListResponse,
  TransactionBulkImportRequest,
  TransactionStats,
  BankAccount,
  BankAccountCreate,
  BankAccountUpdate,
  BankAccountListResponse,
  Currency,
  UsageSummaryResponse,
  DailyUsageResponse,
  ServiceBreakdownResponse,
  RecentRequestsResponse,
  UserTodayUsage,
} from "./types";
import { getAccessToken, getRefreshToken, setTokens, removeTokens } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const response = await axios.post<RefreshTokenResponse>(
            `${API_URL}/auth/refresh`,
            { refresh_token: refreshToken }
          );

          const newAccessToken = response.data.access_token;
          setTokens(newAccessToken, refreshToken);

          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, remove tokens and redirect to login
        removeTokens();
        if (typeof window !== "undefined") {
          // Force a hard redirect to login page
          window.location.replace("/login");
        }
        return Promise.reject(refreshError);
      }
    }

    // If no refresh token available, clear tokens and redirect
    if (error.response?.status === 401 && !getRefreshToken()) {
      removeTokens();
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
    }

    // Handle 403 Forbidden errors (e.g., email not verified)
    if (error.response?.status === 403) {
      // Keep the error message from the backend
      const errorMessage = error.response?.data?.detail || "Access forbidden";

      // Enhance the error object with a more user-friendly message
      error.message = errorMessage;
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await apiClient.post<User>("/auth/register", data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<Token> => {
    const response = await apiClient.post<Token>("/auth/login", data);
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<RefreshTokenResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  verifyEmail: async (token: string): Promise<User> => {
    const response = await apiClient.post<User>(`/auth/verify-email?token=${token}`);
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/auth/resend-verification?email=${email}`);
    return response.data;
  },
};

// User API
export const userApi = {
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>("/users/me");
    return response.data;
  },

  updateProfile: async (data: UserUpdate): Promise<User> => {
    const response = await apiClient.put<User>("/users/me", data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.post("/users/me/change-password", data);
  },

  deactivate: async (): Promise<void> => {
    await apiClient.delete("/users/me");
  },
};

// Client API
export const clientApi = {
  create: async (data: ClientCreate): Promise<Client> => {
    const response = await apiClient.post<Client>("/clients", data);
    return response.data;
  },

  list: async (page: number = 1, pageSize: number = 50, isActive?: boolean): Promise<ClientListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (isActive !== undefined) {
      params.append("is_active", isActive.toString());
    }
    const response = await apiClient.get<ClientListResponse>(`/clients?${params.toString()}`);
    return response.data;
  },

  get: async (id: string): Promise<Client> => {
    const response = await apiClient.get<Client>(`/clients/${id}`);
    return response.data;
  },

  update: async (id: string, data: ClientUpdate): Promise<Client> => {
    const response = await apiClient.put<Client>(`/clients/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/clients/${id}`);
  },

  deactivate: async (id: string): Promise<Client> => {
    const response = await apiClient.post<Client>(`/clients/${id}/deactivate`);
    return response.data;
  },
};

// Invoice API
export const invoiceApi = {
  create: async (data: InvoiceCreate): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>("/invoices", data);
    return response.data;
  },

  list: async (
    page: number = 1,
    pageSize: number = 50,
    filters?: {
      status?: string;
      client_id?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<InvoiceListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (filters) {
      if (filters.status) params.append("status", filters.status);
      if (filters.client_id) params.append("client_id", filters.client_id);
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);
    }
    const response = await apiClient.get<InvoiceListResponse>(`/invoices?${params.toString()}`);
    return response.data;
  },

  get: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  update: async (id: string, data: InvoiceUpdate): Promise<Invoice> => {
    const response = await apiClient.put<Invoice>(`/invoices/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoices/${id}`);
  },

  updateStatus: async (
    id: string,
    status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  ): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/status?status=${status}`);
    return response.data;
  },

  getStats: async (): Promise<InvoiceStats> => {
    const response = await apiClient.get<InvoiceStats>("/invoices/stats");
    return response.data;
  },
};

// Admin API
export const adminApi = {
  // Get admin statistics
  getStatistics: async (): Promise<AdminStatistics> => {
    const response = await apiClient.get<AdminStatistics>("/admin/statistics");
    return response.data;
  },

  // List all users
  listUsers: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    is_verified?: boolean;
    is_active?: boolean;
    is_superuser?: boolean;
  }): Promise<AdminUserListResponse> => {
    const response = await apiClient.get<AdminUserListResponse>("/admin/users", { params });
    return response.data;
  },

  // Get user by ID
  getUserById: async (userId: string): Promise<AdminUser> => {
    const response = await apiClient.get<AdminUser>(`/admin/users/${userId}`);
    return response.data;
  },

  // Update user
  updateUser: async (userId: string, data: AdminUserUpdate): Promise<AdminUser> => {
    const response = await apiClient.put<AdminUser>(`/admin/users/${userId}`, data);
    return response.data;
  },

  // Delete user
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  // Unlock user account
  unlockUser: async (userId: string): Promise<AdminUser> => {
    const response = await apiClient.post<AdminUser>(`/admin/users/${userId}/unlock`);
    return response.data;
  },
};

// Banner API
export const bannerApi = {
  // Get active banners for current user
  getActiveBanners: async (): Promise<SystemBanner[]> => {
    const response = await apiClient.get<SystemBanner[]>("/banners/active");
    return response.data;
  },

  // Admin: Create banner
  createBanner: async (data: SystemBannerCreate): Promise<SystemBanner> => {
    const response = await apiClient.post<SystemBanner>("/banners", data);
    return response.data;
  },

  // Admin: List all banners
  listBanners: async (params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
  }): Promise<SystemBannerListResponse> => {
    const response = await apiClient.get<SystemBannerListResponse>("/banners", { params });
    return response.data;
  },

  // Admin: Get banner by ID
  getBannerById: async (bannerId: string): Promise<SystemBanner> => {
    const response = await apiClient.get<SystemBanner>(`/banners/${bannerId}`);
    return response.data;
  },

  // Admin: Update banner
  updateBanner: async (bannerId: string, data: SystemBannerUpdate): Promise<SystemBanner> => {
    const response = await apiClient.put<SystemBanner>(`/banners/${bannerId}`, data);
    return response.data;
  },

  // Admin: Delete banner
  deleteBanner: async (bannerId: string): Promise<void> => {
    await apiClient.delete(`/banners/${bannerId}`);
  },

  // Admin: Deactivate banner
  deactivateBanner: async (bannerId: string): Promise<SystemBanner> => {
    const response = await apiClient.post<SystemBanner>(`/banners/${bannerId}/deactivate`);
    return response.data;
  },
};

// Document API
export const documentApi = {
  // Upload document for processing
  uploadDocument: async (
    file: File,
    documentType: string = "bank_statement",
    bankAccountId?: string,
    emailNotification: boolean = false
  ): Promise<Document> => {
    const formData = new FormData();
    formData.append("file", file);

    let url = `/documents/upload?document_type=${documentType}&email_notification=${emailNotification}`;
    if (bankAccountId) {
      url += `&bank_account_id=${bankAccountId}`;
    }

    const response = await apiClient.post<Document>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Get document status
  getDocumentStatus: async (documentId: string): Promise<Document> => {
    const response = await apiClient.get<Document>(`/documents/${documentId}`);
    return response.data;
  },

  // List all documents
  listDocuments: async (params?: {
    page?: number;
    page_size?: number;
    document_type?: string;
    status_filter?: string;
  }): Promise<DocumentListResponse> => {
    const response = await apiClient.get<DocumentListResponse>("/documents", { params });
    return response.data;
  },

  // Delete document
  deleteDocument: async (documentId: string): Promise<void> => {
    await apiClient.delete(`/documents/${documentId}`);
  },

  // Get extraction results for review
  getExtractionResults: async (documentId: string): Promise<DocumentExtractionResult> => {
    const response = await apiClient.get<DocumentExtractionResult>(`/documents/${documentId}/extraction`);
    return response.data;
  },
};

// Transaction API
export const transactionApi = {
  // Create manual transaction
  createTransaction: async (data: TransactionCreate): Promise<Transaction> => {
    const response = await apiClient.post<Transaction>("/transactions", data);
    return response.data;
  },

  // Bulk import transactions from review screen
  bulkImportTransactions: async (
    documentId: string,
    data: TransactionBulkImportRequest
  ): Promise<{ message: string; count: number; document_id: string }> => {
    const response = await apiClient.post(
      `/transactions/bulk-import?document_id=${documentId}`,
      data
    );
    return response.data;
  },

  // List transactions with filters
  listTransactions: async (params?: {
    page?: number;
    page_size?: number;
    transaction_type?: string;
    category?: string;
    start_date?: string;
    end_date?: string;
    document_id?: string;
  }): Promise<TransactionListResponse> => {
    const response = await apiClient.get<TransactionListResponse>("/transactions", { params });
    return response.data;
  },

  // Get transaction statistics
  getTransactionStats: async (): Promise<TransactionStats> => {
    const response = await apiClient.get<TransactionStats>("/transactions/stats");
    return response.data;
  },

  // Get single transaction
  getTransaction: async (transactionId: string): Promise<Transaction> => {
    const response = await apiClient.get<Transaction>(`/transactions/${transactionId}`);
    return response.data;
  },

  // Update transaction
  updateTransaction: async (transactionId: string, data: TransactionUpdate): Promise<Transaction> => {
    const response = await apiClient.put<Transaction>(`/transactions/${transactionId}`, data);
    return response.data;
  },

  // Delete transaction
  deleteTransaction: async (transactionId: string): Promise<void> => {
    await apiClient.delete(`/transactions/${transactionId}`);
  },
};

// Bank Account API
export const bankAccountApi = {
  // Create bank account
  createBankAccount: async (data: BankAccountCreate): Promise<BankAccount> => {
    const response = await apiClient.post<BankAccount>("/bank-accounts", data);
    return response.data;
  },

  // Get all bank accounts with pagination and filters
  getBankAccounts: async (params?: {
    page?: number;
    page_size?: number;
    is_active?: boolean;
    currency?: Currency;
  }): Promise<BankAccountListResponse> => {
    const response = await apiClient.get<BankAccountListResponse>("/bank-accounts", { params });
    return response.data;
  },

  // Get active bank accounts (for dropdowns)
  getActiveBankAccounts: async (): Promise<BankAccount[]> => {
    const response = await apiClient.get<BankAccount[]>("/bank-accounts/active");
    return response.data;
  },

  // Get single bank account
  getBankAccount: async (bankAccountId: string): Promise<BankAccount> => {
    const response = await apiClient.get<BankAccount>(`/bank-accounts/${bankAccountId}`);
    return response.data;
  },

  // Update bank account
  updateBankAccount: async (bankAccountId: string, data: BankAccountUpdate): Promise<BankAccount> => {
    const response = await apiClient.put<BankAccount>(`/bank-accounts/${bankAccountId}`, data);
    return response.data;
  },

  // Delete bank account
  deleteBankAccount: async (bankAccountId: string): Promise<void> => {
    await apiClient.delete(`/bank-accounts/${bankAccountId}`);
  },

  // Deactivate bank account (soft delete)
  deactivateBankAccount: async (bankAccountId: string): Promise<BankAccount> => {
    const response = await apiClient.post<BankAccount>(`/bank-accounts/${bankAccountId}/deactivate`);
    return response.data;
  },
};

// API Usage API
export const apiUsageApi = {
  // Get usage summary for all users (admin only)
  getUsageSummary: async (params?: { start_date?: string; end_date?: string; limit?: number }): Promise<UsageSummaryResponse> => {
    const response = await apiClient.get<UsageSummaryResponse>("/api-usage/summary", { params });
    return response.data;
  },

  // Get daily usage trends (admin only)
  getDailyUsage: async (days?: number): Promise<DailyUsageResponse> => {
    const response = await apiClient.get<DailyUsageResponse>("/api-usage/daily", { params: { days } });
    return response.data;
  },

  // Get service breakdown (admin only)
  getServiceBreakdown: async (params?: { start_date?: string; end_date?: string }): Promise<ServiceBreakdownResponse> => {
    const response = await apiClient.get<ServiceBreakdownResponse>("/api-usage/services", { params });
    return response.data;
  },

  // Get recent API requests (admin only)
  getRecentRequests: async (params?: { user_id?: string; limit?: number }): Promise<RecentRequestsResponse> => {
    const response = await apiClient.get<RecentRequestsResponse>("/api-usage/recent", { params });
    return response.data;
  },

  // Get today's usage for a specific user (admin only)
  getUserTodayUsage: async (userId: string): Promise<UserTodayUsage> => {
    const response = await apiClient.get<UserTodayUsage>(`/api-usage/users/${userId}/today`);
    return response.data;
  },

  // Get today's usage for current user
  getMyTodayUsage: async (): Promise<UserTodayUsage> => {
    const response = await apiClient.get<UserTodayUsage>("/api-usage/me/today");
    return response.data;
  },
};

export default apiClient;
