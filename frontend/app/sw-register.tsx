"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered successfully:", registration);

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New service worker is available
                  toast.info("New version available!", {
                    description: "Refresh to update",
                    action: {
                      label: "Refresh",
                      onClick: () => window.location.reload(),
                    },
                    duration: 10000,
                  });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("New Service Worker activated");
      });

      // Handle offline/online events
      window.addEventListener("online", () => {
        toast.success("Back online!", {
          description: "Your connection has been restored",
        });
      });

      window.addEventListener("offline", () => {
        toast.warning("You're offline", {
          description: "Some features may be limited",
          duration: 5000,
        });
      });
    }

    return () => {
      // Cleanup listeners
      window.removeEventListener("online", () => {});
      window.removeEventListener("offline", () => {});
    };
  }, []);

  return null; // This component doesn't render anything
}
