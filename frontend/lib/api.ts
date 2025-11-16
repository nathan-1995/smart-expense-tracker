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

export default apiClient;
