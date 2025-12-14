"use client";

import { useState } from "react";
import { X, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

interface VerificationBannerProps {
  userEmail: string;
}

export default function VerificationBanner({ userEmail }: VerificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isResending, setIsResending] = useState(false);

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await authApi.resendVerification(userEmail);
      toast.success("Verification email sent! Please check your inbox.");
    } catch (error) {
      toast.error("Failed to resend verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg relative">
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-4 right-4 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
            Email Verification Required
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
            Please verify your email address to create invoices and clients.
            We sent a verification link to <span className="font-medium">{userEmail}</span>
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleResendVerification}
              disabled={isResending}
              size="sm"
              variant="outline"
              className="bg-white dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/70"
            >
              <Mail className="h-4 w-4 mr-2" />
              {isResending ? "Sending..." : "Resend Verification Email"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
