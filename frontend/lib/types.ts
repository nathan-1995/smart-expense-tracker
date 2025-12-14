// User types
export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  currency: string;
  tax_id: string | null;
  logo_url: string | null;
  subscription_tier: string;
  subscription_status: string;
  trial_ends_at: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

// Auth request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
}

// User update types
export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  business_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  tax_id?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// API response types

// API error types
export interface ApiError {
  detail: string;
}

// Auth context types
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateUser: (data: UserUpdate) => Promise<void>;
}

// Client types
export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  currency: string | null;
  tax_id: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface ClientCreate {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  tax_id?: string;
  notes?: string;
  is_active?: boolean;
}

export interface ClientUpdate {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  tax_id?: string;
  notes?: string;
  is_active?: boolean;
}

export interface ClientListResponse {
  clients: Client[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Invoice types
export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  order_index: number;
}

export interface InvoiceItemCreate {
  description: string;
  quantity: number;
  rate: number;
  order_index?: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number;
  discount_amount: number;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  payment_date: string | null;
  payment_method: string | null;
  notes: string | null;
  terms: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  reminder_sent_at: string | null;
  items: InvoiceItem[];
}

export interface InvoiceCreate {
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  currency: string;
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
  terms?: string;
  status?: "draft" | "sent";
  items: InvoiceItemCreate[];
}

export interface InvoiceUpdate {
  client_id?: string;
  invoice_number?: string;
  issue_date?: string;
  due_date?: string;
  currency?: string;
  tax_rate?: number;
  discount_amount?: number;
  status?: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  terms?: string;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface InvoiceStats {
  total_invoices: number;
  draft_count: number;
  sent_count: number;
  paid_count: number;
  overdue_count: number;
  cancelled_count: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
}

// Admin types
export interface AdminUser extends User {
  account_age_days: number;
  is_locked: boolean;
  failed_login_attempts: number;
  locked_until: string | null;
  verified_at: string | null;
}

export interface AdminUserUpdate {
  first_name?: string;
  last_name?: string;
  business_name?: string;
  phone?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminStatistics {
  total_users: number;
  verified_users: number;
  unverified_users: number;
  active_users: number;
  locked_users: number;
  superusers: number;
  users_created_today: number;
  users_created_this_week: number;
  users_created_this_month: number;
  active_banners: number;
}

// System Banner types
export type BannerType = "info" | "success" | "warning" | "error" | "maintenance";

export interface SystemBanner {
  id: string;
  message: string;
  banner_type: BannerType;
  show_to_unverified_only: boolean;
  action_url: string | null;
  action_text: string | null;
  is_dismissible: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemBannerCreate {
  message: string;
  banner_type?: BannerType;
  show_to_unverified_only?: boolean;
  action_url?: string | null;
  action_text?: string | null;
  is_dismissible?: boolean;
}

export interface SystemBannerUpdate {
  message?: string;
  banner_type?: BannerType;
  is_active?: boolean;
  show_to_unverified_only?: boolean;
  action_url?: string | null;
  action_text?: string | null;
  is_dismissible?: boolean;
}

export interface SystemBannerListResponse {
  banners: SystemBanner[];
  total: number;
  skip: number;
  limit: number;
}
