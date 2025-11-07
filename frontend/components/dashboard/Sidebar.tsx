"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  User,
  FileText,
  Receipt,
  Settings,
} from "lucide-react";

const menuItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    icon: User,
  },
  {
    href: "/dashboard/invoices",
    label: "Invoices",
    icon: FileText,
    disabled: true,
  },
  {
    href: "/dashboard/expenses",
    label: "Expenses",
    icon: Receipt,
    disabled: true,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    disabled: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">FinTrack</h1>
        <p className="text-sm text-muted-foreground">Invoice & Expense Manager</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.disabled && (
                <span className="ml-auto text-xs">(Soon)</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-border space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-medium text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
