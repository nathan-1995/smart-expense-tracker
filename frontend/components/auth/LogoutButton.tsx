"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const { logout } = useAuth();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={logout}
      className="w-full justify-start"
    >
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );
}
