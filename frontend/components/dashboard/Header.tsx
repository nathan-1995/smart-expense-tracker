"use client";

import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HamburgerMenu } from "@/components/ui/hamburger-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ onMenuClick, isSidebarOpen = false }: HeaderProps) {
  const { user, logout } = useAuth();

  const getInitials = () => {
    if (!user) return "U";
    const firstInitial = user.first_name?.charAt(0) || "";
    const lastInitial = user.last_name?.charAt(0) || "";
    return (firstInitial + lastInitial).toUpperCase() || "U";
  };

  const getFullName = () => {
    if (!user) return "User";
    return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User";
  };

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

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{getFullName()}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/dashboard/profile">
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
