"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  RegisterRequest,
  UserUpdate,
  AuthContextType,
} from "@/lib/types";
import { authApi, userApi } from "@/lib/api";
import { setTokens, removeTokens, getAccessToken, isTokenExpired } from "@/lib/auth";
import { toast } from "sonner";

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = getAccessToken();

      if (token && !isTokenExpired(token)) {
        try {
          const userData = await userApi.getProfile();
          setUser(userData);
        } catch (error) {
          console.error("Failed to load user:", error);
          removeTokens();
        }
      }

      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string, suppressToast?: boolean): Promise<void> => {
    try {
      const tokenData = await authApi.login({ email, password });
      setTokens(tokenData.access_token, tokenData.refresh_token);

      const userData = await userApi.getProfile();
      setUser(userData);

      if (!suppressToast) {
        toast.success("Login successful!");
      }

      // Redirect based on user role
      if (userData.is_superuser) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message = apiError?.response?.data?.detail || "Login failed. Please check your credentials.";
      toast.error(message);
      throw error;
    }
  };

  const register = async (data: RegisterRequest): Promise<void> => {
    try {
      await authApi.register(data);

      // Auto-login after registration
      await login(data.email, data.password, true);
      toast.success("Registration successful!");
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message = apiError?.response?.data?.detail || "Registration failed. Please try again.";
      toast.error(message);
      throw error;
    }
  };

  const logout = (): void => {
    removeTokens();
    setUser(null);
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const userData = await userApi.getProfile();
      setUser(userData);
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      removeTokens();
      setUser(null);
    }
  };

  const updateUser = async (data: UserUpdate): Promise<void> => {
    try {
      const updatedUser = await userApi.updateProfile(data);
      setUser(updatedUser);
      toast.success("Profile updated successfully!");
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message = apiError?.response?.data?.detail || "Failed to update profile.";
      toast.error(message);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
