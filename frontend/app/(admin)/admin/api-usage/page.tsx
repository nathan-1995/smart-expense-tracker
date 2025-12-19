"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiUsageApi } from "@/lib/api";
import type {
  UsageSummaryResponse,
  DailyUsageResponse,
  UserUsageStats,
  DailyUsageStats,
  RecentRequestsResponse,
  APIUsageDetail,
} from "@/lib/types";
import { AlertCircle, CheckCircle, Clock, TrendingUp, Users, Zap, ArrowLeft, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";

export default function APIUsagePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<UsageSummaryResponse | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageResponse | null>(null);
  const [recentRequests, setRecentRequests] = useState<RecentRequestsResponse | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"7" | "30" | "90">("30");
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Gemini Free Tier Limits (as of December 2025)
  const GEMINI_FREE_TIER = {
    rpm: 15, // Requests per minute
    tpm: 250000, // Tokens per minute
    rpd: 1000, // Requests per day
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch summary, daily usage, and recent requests in parallel
      const [summaryData, dailyData, recentData] = await Promise.all([
        apiUsageApi.getUsageSummary({ limit: 100 }),
        apiUsageApi.getDailyUsage(parseInt(selectedPeriod)),
        apiUsageApi.getRecentRequests({ limit: 50 }),
      ]);

      setSummary(summaryData);
      setDailyUsage(dailyData);
      setRecentRequests(recentData);
    } catch (err: any) {
      console.error("Error fetching API usage data:", err);
      setError(err.response?.data?.detail || "Failed to load API usage data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">API Usage</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">API Usage</h1>
        <Card>
          <CardContent className="p-6">
            <div className="text-destructive">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate today's usage
  const todayUsage = dailyUsage?.days[0] || {
    total_tokens: 0,
    request_count: 0,
  };

  // Calculate usage percentages for Gemini limits
  const dailyUsagePercent = Math.min(
    100,
    ((todayUsage.request_count || 0) / GEMINI_FREE_TIER.rpd) * 100
  );

  // Get users to display
  const usersToShow = showAllUsers
    ? summary?.users || []
    : (summary?.users || []).slice(0, 10);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Usage Dashboard</h1>
          <p className="text-muted-foreground">Monitor API usage and quotas</p>
        </div>
        <div className="flex gap-2 items-center">
          <ThemeToggle />
          <Button variant="outline" onClick={() => router.push("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="mb-6 flex justify-end gap-2">
        <button
          onClick={() => setSelectedPeriod("7")}
          className={`px-3 py-1 rounded ${
            selectedPeriod === "7"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary"
          }`}
        >
          7 days
        </button>
        <button
          onClick={() => setSelectedPeriod("30")}
          className={`px-3 py-1 rounded ${
            selectedPeriod === "30"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary"
          }`}
        >
          30 days
        </button>
        <button
          onClick={() => setSelectedPeriod("90")}
          className={`px-3 py-1 rounded ${
            selectedPeriod === "90"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary"
          }`}
        >
          90 days
        </button>
      </div>

      <div className="space-y-6">
        {/* Gemini API Quota Card */}
        <Card className="border-blue-500/30 bg-blue-50/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Gemini Free Tier Usage
          </CardTitle>
          <CardDescription>
            Daily quota tracking for Google Gemini API (Free Tier)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Requests Per Day */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Requests Today</span>
                <span className="font-medium">
                  {formatNumber(todayUsage.request_count || 0)} /{" "}
                  {formatNumber(GEMINI_FREE_TIER.rpd)}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    dailyUsagePercent > 80
                      ? "bg-red-500"
                      : dailyUsagePercent > 50
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${dailyUsagePercent}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {(100 - dailyUsagePercent).toFixed(1)}% remaining
              </p>
            </div>

            {/* Tokens Today */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tokens Today</span>
                <span className="font-medium">
                  {formatNumber(todayUsage.total_tokens || 0)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                TPM Limit: {formatNumber(GEMINI_FREE_TIER.tpm)} / minute
              </div>
            </div>

            {/* Info */}
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>✓ Free tier: 15 RPM, 250K TPM</p>
              <p>✓ Daily quota resets at midnight PT</p>
              <p>✓ No credit card required</p>
            </div>
          </div>
        </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summary?.total_tokens || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time usage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summary?.total_requests || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">API calls made</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Tokens/Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary && summary.total_requests > 0
                ? formatNumber(
                    Math.round(summary.total_tokens / summary.total_requests)
                  )
                : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per API call</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.users.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">With API usage</p>
          </CardContent>
          </Card>
        </div>

        {/* Daily Usage Chart */}
        <Card>
        <CardHeader>
          <CardTitle>Daily Usage Trend</CardTitle>
          <CardDescription>
            Token consumption over the last {selectedPeriod} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dailyUsage?.days.slice(0, 15).map((day: DailyUsageStats) => {
              const maxTokens = Math.max(
                ...dailyUsage.days.map((d) => d.total_tokens)
              );
              return (
                <div
                  key={day.date}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="text-sm font-medium min-w-[80px]">
                    {formatDate(day.date)}
                  </div>
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
                      <span>{formatNumber(day.total_tokens)} tokens</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
                      <span>{formatNumber(day.request_count)} reqs</span>
                    </div>
                    {day.failed_requests > 0 && (
                      <div className="text-sm text-destructive min-w-[80px]">
                        {day.failed_requests} failed
                      </div>
                    )}
                    <div className="flex-1 bg-secondary rounded-full h-2 min-w-[200px]">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (day.total_tokens / maxTokens) * 100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Per-User Usage */}
          <Card>
          <CardHeader>
            <CardTitle>Usage by User</CardTitle>
            <CardDescription>
              {showAllUsers ? "All users" : "Top 10 users"} by token consumption
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {usersToShow.map((user: UserUsageStats, index: number) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      #{index + 1}
                    </div>
                    <div className="flex flex-col">
                      <div className="text-sm font-medium font-mono">
                        {user.user_id.slice(0, 8)}...
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(user.request_count)} requests • Avg{" "}
                        {user.avg_duration_ms}ms
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-sm font-semibold">
                      {formatNumber(user.total_tokens)} tokens
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(user.input_tokens)} in •{" "}
                      {formatNumber(user.output_tokens)} out
                    </div>
                  </div>
                </div>
              ))}
              {summary && summary.users.length > 10 && (
                <button
                  onClick={() => setShowAllUsers(!showAllUsers)}
                  className="w-full py-2 text-sm text-primary hover:underline"
                >
                  {showAllUsers
                    ? "Show top 10 only"
                    : `Show all ${summary.users.length} users`}
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent API Requests</CardTitle>
            <CardDescription>Latest API calls across all users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRequests?.requests.slice(0, 10).map((req: APIUsageDetail) => (
                <div
                  key={req.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-secondary/50 border border-border/50"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`flex items-center justify-center w-6 h-6 rounded-full mt-0.5 ${
                        req.success
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {req.success ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="text-xs font-medium">
                        {req.service} • {req.operation}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        User: {req.user_id?.slice(0, 8) || "system"}...
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(req.created_at)}
                      </div>
                      {req.error_message && (
                        <div className="text-xs text-destructive mt-1">
                          {req.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end text-xs ml-3">
                    <div className="font-semibold">
                      {formatNumber(req.total_tokens)}
                    </div>
                    <div className="text-muted-foreground">tokens</div>
                    {req.duration_ms && (
                      <div className="text-muted-foreground mt-1">
                        {req.duration_ms}ms
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
