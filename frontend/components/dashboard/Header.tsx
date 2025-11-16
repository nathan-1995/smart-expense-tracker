"use client";

import { useAuth } from "@/hooks/useAuth";
import { HamburgerMenu } from "@/components/ui/hamburger-menu";

interface HeaderProps {
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ onMenuClick, isSidebarOpen = false }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Animated Hamburger Menu (Mobile Only) */}
        <div className="flex items-center gap-4">
          <div className="md:hidden">
            <HamburgerMenu
              isOpen={isSidebarOpen}
              onClick={onMenuClick}
              className="text-foreground"
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold">Welcome back, {user?.first_name || "User"}!</h2>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Manage your invoices and expenses
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
