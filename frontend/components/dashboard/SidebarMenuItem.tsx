"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface MenuItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: string;
  children?: MenuItem[];
}

interface SidebarMenuItemProps {
  item: MenuItem;
  onNavigate?: () => void;
  isCollapsed?: boolean;
}

export function SidebarMenuItem({ item, onNavigate, isCollapsed = false }: SidebarMenuItemProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  // Check if current path matches this item or any of its children
  const isActive = pathname === item.href ||
    (hasChildren && item.children?.some(child => pathname === child.href));

  // If item has children, render collapsible menu (hide children when collapsed)
  if (hasChildren && !isCollapsed) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full overflow-hidden",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            item.disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={item.disabled}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
          {item.disabled && <span className="text-xs whitespace-nowrap">(Soon)</span>}
          {!item.disabled && (
            isOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-6 mt-1 space-y-1">
          {item.children?.map((child) => (
            <SidebarMenuItem key={child.href || child.label} item={child} onNavigate={onNavigate} isCollapsed={isCollapsed} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // When collapsed and has children, show as icon-only link to first child
  if (hasChildren && isCollapsed && item.children && item.children.length > 0) {
    const firstChild = item.children[0];
    return (
      <Link
        href={firstChild.disabled ? "#" : firstChild.href!}
        className={cn(
          "flex items-center justify-center p-3 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          item.disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={(e) => {
          if (item.disabled) {
            e.preventDefault();
          } else {
            onNavigate?.();
          }
        }}
        title={item.label}
      >
        <Icon className="h-5 w-5 shrink-0" />
      </Link>
    );
  }

  // Single menu item without children or collapsed view
  return (
    <Link
      href={item.disabled ? "#" : item.href!}
      className={cn(
        "flex items-center rounded-lg text-sm font-medium transition-colors overflow-hidden",
        isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2",
        pathname === item.href
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        item.disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={(e) => {
        if (item.disabled) {
          e.preventDefault();
        } else {
          onNavigate?.();
        }
      }}
      title={isCollapsed ? item.label : undefined}
    >
      <Icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
      {!isCollapsed && (
        <>
          <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
          {item.disabled && <span className="text-xs whitespace-nowrap">(Soon)</span>}
          {item.badge && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
