"use client";

import { useEffect, useState } from "react";
import { X, Info, CheckCircle, AlertTriangle, XCircle, Settings, ExternalLink } from "lucide-react";
import { bannerApi } from "@/lib/api";
import { SystemBanner, BannerType } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function SystemBanners() {
  const [banners, setBanners] = useState<SystemBanner[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const data = await bannerApi.getActiveBanners();
        setBanners(data);
      } catch (error) {
        console.error("Failed to fetch banners:", error);
      }
    };

    fetchBanners();

    // Load dismissed banners from localStorage
    const dismissed = localStorage.getItem("dismissedBanners");
    if (dismissed) {
      setDismissedBanners(JSON.parse(dismissed));
    }

    // Poll for new banners every 10 seconds
    const pollInterval = setInterval(() => {
      fetchBanners();
    }, 10000);

    // Listen for custom banner update events (triggered by admin panel)
    const handleBannerUpdate = () => {
      fetchBanners();
    };
    window.addEventListener("bannersUpdated", handleBannerUpdate);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("bannersUpdated", handleBannerUpdate);
    };
  }, []);

  const handleDismiss = (bannerId: string) => {
    const newDismissed = [...dismissedBanners, bannerId];
    setDismissedBanners(newDismissed);
    localStorage.setItem("dismissedBanners", JSON.stringify(newDismissed));
  };

  const getBannerStyles = (type: BannerType) => {
    switch (type) {
      case "info":
        return {
          bg: "bg-blue-50 dark:bg-blue-950/30",
          border: "border-blue-500",
          text: "text-blue-900 dark:text-blue-200",
          icon: "text-blue-600 dark:text-blue-500",
        };
      case "success":
        return {
          bg: "bg-green-50 dark:bg-green-950/30",
          border: "border-green-500",
          text: "text-green-900 dark:text-green-200",
          icon: "text-green-600 dark:text-green-500",
        };
      case "warning":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/30",
          border: "border-amber-500",
          text: "text-amber-900 dark:text-amber-200",
          icon: "text-amber-600 dark:text-amber-500",
        };
      case "error":
        return {
          bg: "bg-red-50 dark:bg-red-950/30",
          border: "border-red-500",
          text: "text-red-900 dark:text-red-200",
          icon: "text-red-600 dark:text-red-500",
        };
      case "maintenance":
        return {
          bg: "bg-purple-50 dark:bg-purple-950/30",
          border: "border-purple-500",
          text: "text-purple-900 dark:text-purple-200",
          icon: "text-purple-600 dark:text-purple-500",
        };
      default:
        return {
          bg: "bg-gray-50 dark:bg-gray-950/30",
          border: "border-gray-500",
          text: "text-gray-900 dark:text-gray-200",
          icon: "text-gray-600 dark:text-gray-500",
        };
    }
  };

  const getBannerIcon = (type: BannerType) => {
    const iconClass = "h-5 w-5";
    switch (type) {
      case "info":
        return <Info className={iconClass} />;
      case "success":
        return <CheckCircle className={iconClass} />;
      case "warning":
        return <AlertTriangle className={iconClass} />;
      case "error":
        return <XCircle className={iconClass} />;
      case "maintenance":
        return <Settings className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  const visibleBanners = banners.filter(
    (banner) => !dismissedBanners.includes(banner.id)
  );

  if (visibleBanners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {visibleBanners.map((banner) => {
        const styles = getBannerStyles(banner.banner_type);

        return (
          <div
            key={banner.id}
            className={`${styles.bg} border-l-4 ${styles.border} p-4 rounded-r-lg relative`}
          >
            {banner.is_dismissible && (
              <button
                onClick={() => handleDismiss(banner.id)}
                className={`absolute top-4 right-4 ${styles.text} hover:opacity-70 transition-opacity`}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="flex items-start gap-3 pr-8">
              <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
                {getBannerIcon(banner.banner_type)}
              </div>

              <div className="flex-1">
                <p className={`text-sm ${styles.text} mb-2`}>
                  {banner.message}
                </p>

                {banner.action_url && banner.action_text && (
                  <a
                    href={banner.action_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 text-sm font-medium ${styles.text} hover:underline`}
                  >
                    {banner.action_text}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
