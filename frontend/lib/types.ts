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
