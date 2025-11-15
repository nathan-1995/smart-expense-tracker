"use client";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarMenuItem, type MenuItem } from "./SidebarMenuItem";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronRight,
} from "lucide-react";

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
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
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
      <div className="flex-1 overflow-y-auto space-y-1">
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

      {/* Footer - Theme Toggle */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-auto border-t border-border pt-3"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Theme</span>
              <ThemeToggle />
            </div>
            <LogoutButton />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="border-t border-border transition-colors hover:bg-accent"
        >
          <div className="flex items-center p-2 overflow-hidden">
            <div className="grid size-10 shrink-0 place-content-center text-lg">
              <ChevronRight
                className={cn(
                  "transition-transform duration-500",
                  open && "rotate-180"
                )}
              />
            </div>
            <AnimatePresence>
              {open && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs font-medium whitespace-nowrap"
                >
                  Hide
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </button>
      )}
    </motion.nav>
  );
}
