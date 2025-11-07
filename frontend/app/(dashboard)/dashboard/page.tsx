"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Receipt, DollarSign, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      title: "Total Income",
      value: "$0.00",
      description: "This month",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Total Expenses",
      value: "$0.00",
      description: "This month",
      icon: Receipt,
      color: "text-red-600",
    },
    {
      title: "Invoices",
      value: "0",
      description: "Active invoices",
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Net Profit",
      value: "$0.00",
      description: "This month",
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
            <h3 className="font-semibold mb-2">Getting Started</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Complete your profile with business information</li>
              <li>Create your first invoice (Coming soon)</li>
              <li>Track your expenses (Coming soon)</li>
              <li>View reports and analytics (Coming soon)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
