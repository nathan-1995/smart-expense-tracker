"use client";

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarMenuItem, type MenuItem } from "./SidebarMenuItem";
import { HamburgerMenu } from "@/components/ui/hamburger-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { userApi } from "@/lib/api";
import type { User as UserType } from "@/lib/types";
import {
  LayoutDashboard,
  User,
  FileText,
  Receipt,
  Settings,
  Users,
  Plus,
  List,
  Banknote,
  MoreVertical,
  LogOut,
  Shield,
  Upload,
  CreditCard,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

const menuItems: MenuItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Invoices",
    icon: FileText,
    children: [
      {
        href: "/invoices",
        label: "View All",
        icon: List,
      },
      {
        href: "/invoices/new",
        label: "Create Invoice",
        icon: Plus,
      },
    ],
  },
  {
    label: "Clients",
    icon: Users,
    children: [
      {
        href: "/clients",
        label: "View All",
        icon: List,
      },
      {
        href: "/clients/new",
        label: "Add Client",
        icon: Plus,
      },
    ],
  },
  {
    label: "Bank Accounts",
    icon: Banknote,
    children: [
      {
        href: "/bank-accounts",
        label: "View All",
        icon: List,
      },
      {
        href: "/bank-accounts#add",
        label: "Add Account",
        icon: Plus,
      },
    ],
  },
  {
    label: "Transactions",
    icon: CreditCard,
    children: [
      {
        href: "/transactions",
        label: "View All",
        icon: List,
      },
      {
        href: "/transactions#upload",
        label: "Upload Statement",
        icon: Upload,
      },
    ],
  },
  {
    href: "/dashboard/expenses",
    label: "Expenses",
    icon: Receipt,
    disabled: true,
  },
];

const settingsItems: MenuItem[] = [
  {
    href: "/dashboard/profile",
    label: "Profile",
    icon: User,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    disabled: true,
  },
];

interface SidebarProps {
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ onNavigate, isCollapsed = false, onToggle }: SidebarProps) {
  const open = !isCollapsed;
  const { user, logout } = useAuth();

  const getDisplayName = () => {
    if (!user) return "User";
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.business_name) return user.business_name;
    return user.email.split("@")[0];
  };

  return (
    <motion.nav
      className="sticky top-0 h-screen border-r border-border bg-card p-2 flex flex-col overflow-hidden"
      initial={false}
      animate={{
        width: open ? "256px" : "64px",
      }}
      transition={{
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {/* Logo Branding */}
      <div className="mb-3 border-b border-border pb-3">
        <div className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-accent overflow-hidden">
          <div className="grid size-10 shrink-0 place-content-center rounded-md bg-primary">
            <Banknote className="h-6 w-6 text-primary-foreground" />
          </div>
          <AnimatePresence mode="wait">
            {open && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1]
                }}
                className="overflow-hidden"
              >
                <span className="block text-sm font-semibold whitespace-nowrap">FinTrack</span>
                <span className="block text-xs text-muted-foreground whitespace-nowrap">Invoice & Expense Manager</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
        {menuItems.map((item) => (
          <SidebarMenuItem
            key={item.href || item.label}
            item={item}
            onNavigate={onNavigate}
            isCollapsed={!open}
          />
        ))}

        {/* Content Separator */}
        {open && <hr className="my-4 border-border" />}

        {/* Admin Panel - Only show for superusers */}
        {user?.is_superuser && (
          <SidebarMenuItem
            item={{
              href: "/admin",
              label: "Admin Panel",
              icon: Shield,
            }}
            onNavigate={onNavigate}
            isCollapsed={!open}
          />
        )}

        {/* Settings & Profile Section */}
        {settingsItems.map((item) => (
          <SidebarMenuItem
            key={item.href}
            item={item}
            onNavigate={onNavigate}
            isCollapsed={!open}
          />
        ))}
      </div>

      {/* Footer Section */}
      <div className="mt-auto border-t border-border pt-3 space-y-2">
        {/* Theme Toggle */}
        <div className="flex items-center px-2 py-1">
          {open ? (
            <div className="flex items-center justify-between w-full px-1">
              <AnimatePresence mode="wait">
                {open && (
                  <motion.span
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                    className="text-xs font-medium text-muted-foreground whitespace-nowrap"
                  >
                    Theme
                  </motion.span>
                )}
              </AnimatePresence>
              <ThemeToggle />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <ThemeToggle compact />
            </div>
          )}
        </div>

        {/* Hamburger Toggle */}
        {onToggle && (
          <div className="flex items-center justify-center px-2">
            <HamburgerMenu isOpen={open} onClick={onToggle} />
          </div>
        )}

        {/* User Profile */}
        <div className="flex items-center gap-2 px-2 py-2">
          {open ? (
            <>
              {/* Avatar */}
              <div className="size-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer">
                <User className="h-5 w-5 text-primary" />
              </div>
              {/* Name and Email */}
              <AnimatePresence mode="wait">
                {open && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                    className="flex-1 overflow-hidden"
                  >
                    <p className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {getDisplayName()}
                    </p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                      {user?.email || ""}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Three-dot Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="shrink-0 rounded-md p-1 hover:bg-accent transition-colors cursor-pointer">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            // Collapsed state - just show avatar (centered)
            <div className="w-full flex justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="size-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer">
                    <User className="h-5 w-5 text-primary" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
