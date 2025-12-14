"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import LoadingScreen from "@/components/LoadingScreen";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (!user?.is_superuser) {
        // Redirect non-admin users to regular dashboard
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user?.is_superuser) {
    return null;
  }

  return <>{children}</>;
}
