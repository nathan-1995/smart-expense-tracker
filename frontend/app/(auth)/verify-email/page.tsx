"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        return;
      }

      try {
        await authApi.verifyEmail(token);
        setStatus("success");
        setMessage("Your email has been verified successfully!");

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 3000);
      } catch (error: any) {
        setStatus("error");

        if (error.response?.data?.detail) {
          setMessage(error.response.data.detail);
        } else if (error.response?.status === 400) {
          setMessage("Invalid or expired verification token.");
        } else if (error.response?.status === 404) {
          setMessage("User not found.");
        } else {
          setMessage("Something went wrong. Please try again.");
        }
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* Theme Toggle - Fixed top right */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Centered Card with Status */}
      <div className="w-full max-w-md">
        <div className="bg-card border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary mb-4">
              <svg
                className="h-6 w-6 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">FinTrack</h1>
          </div>

          {/* Status Message */}
          <div className="text-center">
            {status === "loading" && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  Verifying your email...
                </h2>
                <p className="text-sm text-muted-foreground">
                  Please wait while we verify your email address.
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center gap-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h2 className="text-xl font-semibold text-foreground">
                  Email Verified!
                </h2>
                <p className="text-sm text-muted-foreground">{message}</p>
                <p className="text-xs text-muted-foreground">
                  Redirecting to dashboard in 3 seconds...
                </p>
                <Button onClick={() => router.push("/dashboard")} className="mt-4">
                  Go to Dashboard
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center gap-4">
                <XCircle className="h-16 w-16 text-red-500" />
                <h2 className="text-xl font-semibold text-foreground">
                  Verification Failed
                </h2>
                <p className="text-sm text-muted-foreground">{message}</p>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => router.push("/login")} variant="outline">
                    Go to Login
                  </Button>
                  <Button onClick={() => router.push("/register")}>
                    Register Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Secure email verification powered by FinTrack
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <div className="fixed top-6 right-6 z-50">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="bg-card border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
              <h2 className="text-xl font-semibold text-foreground mt-4">
                Loading...
              </h2>
            </div>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
