"use client";

import { WifiOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
            <WifiOff className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl">You're Offline</CardTitle>
          <CardDescription>
            No internet connection detected. Some features may be limited.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p className="font-medium">While offline, you can:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>View previously loaded pages</li>
              <li>Browse cached invoices and clients</li>
              <li>View your dashboard stats</li>
            </ul>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">You cannot:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Create or update records</li>
              <li>Upload documents</li>
              <li>Sync with the server</li>
            </ul>
          </div>

          <Button
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Try Again
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your changes will sync automatically when you're back online
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
