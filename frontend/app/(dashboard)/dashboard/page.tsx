"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { invoiceApi } from "@/lib/api";
import { InvoiceStats } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Receipt, DollarSign, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoiceStats();
  }, []);

  const loadInvoiceStats = async () => {
    try {
      setLoading(true);
      const stats = await invoiceApi.getStats();
      setInvoiceStats(stats);
    } catch (error) {
      console.error("Failed to load invoice stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const stats = [
    {
      title: "Total Income",
      value: loading ? "..." : formatCurrency(invoiceStats?.paid_amount || 0),
      description: "From paid invoices",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Total Expenses",
      value: "$0.00",
      description: "Coming soon",
      icon: Receipt,
      color: "text-red-600",
    },
    {
      title: "Invoices",
      value: loading ? "..." : String(invoiceStats?.total_invoices || 0),
      description: `${invoiceStats?.draft_count || 0} drafts, ${invoiceStats?.sent_count || 0} sent`,
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Net Profit",
      value: loading ? "..." : formatCurrency(invoiceStats?.paid_amount || 0),
      description: "Income - Expenses",
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your financial activities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to FinTrack!</CardTitle>
          <CardDescription>
            Start managing your invoices and expenses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Your Account</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                {user?.email}
              </p>
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                {user?.first_name} {user?.last_name}
              </p>
              <p>
                <span className="text-muted-foreground">Subscription:</span>{" "}
                {user?.subscription_tier}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Quick Stats</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Total Invoices:</span>{" "}
                {invoiceStats?.total_invoices || 0}
              </p>
              <p>
                <span className="text-muted-foreground">Paid Invoices:</span>{" "}
                {invoiceStats?.paid_count || 0} ({formatCurrency(invoiceStats?.paid_amount || 0)})
              </p>
              <p>
                <span className="text-muted-foreground">Outstanding:</span>{" "}
                {(invoiceStats?.sent_count || 0) + (invoiceStats?.overdue_count || 0)} ({formatCurrency(invoiceStats?.outstanding_amount || 0)})
              </p>
              <p>
                <span className="text-muted-foreground">Overdue:</span>{" "}
                {invoiceStats?.overdue_count || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
