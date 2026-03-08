"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoadingButtonProps = React.ComponentProps<typeof Button> & {
  isLoading?: boolean;
  loadingText?: string;
  spinnerClassName?: string;
};

export function LoadingButton({
  isLoading = false,
  loadingText,
  spinnerClassName,
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <>
          <Loader2 className={cn("h-4 w-4 animate-spin", spinnerClassName)} />
          <span>{loadingText ?? "Loading..."}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}

