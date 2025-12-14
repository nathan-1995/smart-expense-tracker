export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center space-y-6">
        {/* Logo or Brand Icon */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Animated spinner ring */}
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>

            {/* Brand icon in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="h-8 w-8 text-primary"
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
          </div>
        </div>

        {/* Brand name and loading text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">FinTracker</h2>
          <p className="text-sm text-muted-foreground animate-pulse">Loading your dashboard...</p>
        </div>

        {/* Animated dots */}
        <div className="flex justify-center gap-1">
          <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    </div>
  );
}
