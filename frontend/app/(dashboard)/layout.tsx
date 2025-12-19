"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { HamburgerMenu } from "@/components/ui/hamburger-menu";
import VerificationBanner from "@/components/dashboard/VerificationBanner";
import SystemBanners from "@/components/dashboard/SystemBanners";
import LoadingScreen from "@/components/LoadingScreen";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Open by default on desktop

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <WebSocketProvider>
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - Part of layout, pushes content */}
      <aside
        className={cn(
          "hidden md:block transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isSidebarOpen ? "w-64" : "w-16"
        )}
      >
        <Sidebar
          isCollapsed={!isSidebarOpen}
          onToggle={toggleSidebar}
        />
      </aside>

      {/* Mobile Sidebar - Overlay with backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden transition-opacity duration-300",
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={closeSidebar}
        />

        {/* Sidebar */}
        <div
          className={cn(
            "absolute left-0 top-0 h-full transition-transform duration-300 ease-in-out",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar onNavigate={closeSidebar} />
        </div>
      </div>

      {/* Main Content - Expands when sidebar closes on desktop */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="flex-1 p-6">
          <SystemBanners />
          {user && !user.is_verified && (
            <VerificationBanner userEmail={user.email} />
          )}
          {children}
        </main>
      </div>
    </div>
    </WebSocketProvider>
  );
}
