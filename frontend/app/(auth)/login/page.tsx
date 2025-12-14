"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/theme-toggle";
import LoadingScreen from "@/components/LoadingScreen";

export default function LoginPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect admins to admin panel, regular users to dashboard
      if (user?.is_superuser) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* Theme Toggle - Fixed top right */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Centered Card with Form */}
      <div className="w-full max-w-md">
        <div className="bg-card border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary mb-4">
              <svg
                className="h-6 w-6 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              FinTrack
            </h1>
          </div>

          <LoginForm />
        </div>

        {/* Footer text */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Secure login powered by FinTrack
        </p>
      </div>
    </div>
  );
}
