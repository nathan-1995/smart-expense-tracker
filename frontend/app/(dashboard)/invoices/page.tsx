"use client";

import { useState } from "react";
import Link from "next/link";
import { useInvoices, useInvoiceStats } from "@/hooks/api/useInvoices";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, FileText, DollarSign, Clock, CheckCircle, Search, Filter, X, Download } from "lucide-react";
import { toast } from "sonner";

export default function InvoicesPage() {
  const [page, setPage] = useState(1);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Build filters object
  const filters = {
    status: statusFilter || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  };

  // Use React Query hooks - automatic caching and refetching
  const { data: invoiceData, isLoading: loading } = useInvoices(page, 10, filters);
  const { data: stats } = useInvoiceStats();

  const invoices = invoiceData?.invoices || [];
  const totalPages = invoiceData?.total_pages || 1;

  // Client-side filtering for search (only on current page)
  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(query) ||
      invoice.client_name?.toLowerCase().includes(query) ||
      invoice.status.toLowerCase().includes(query)
    );
  });

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter(null);
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const exportToCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices to export");
      return;
    }

    // CSV headers
    const headers = ["Invoice Number", "Client", "Issue Date", "Due Date", "Status", "Currency", "Subtotal", "Tax", "Discount", "Total"];

    // CSV rows
    const rows = filteredInvoices.map((invoice) => [
      invoice.invoice_number,
      invoice.client_name || "",
      formatDate(invoice.issue_date),
      formatDate(invoice.due_date),
      invoice.status,
      invoice.currency,
      Number(invoice.subtotal).toFixed(2),
      Number(invoice.tax_amount).toFixed(2),
      Number(invoice.discount_amount).toFixed(2),
      Number(invoice.total).toFixed(2),
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredInvoices.length} invoices to CSV`);
  };

  const exportToExcel = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices to export");
      return;
    }

    // Create HTML table
    const headers = ["Invoice Number", "Client", "Issue Date", "Due Date", "Status", "Currency", "Subtotal", "Tax", "Discount", "Total"];

    const rows = filteredInvoices.map((invoice) => `
      <tr>
        <td>${invoice.invoice_number}</td>
        <td>${invoice.client_name || ""}</td>
        <td>${formatDate(invoice.issue_date)}</td>
        <td>${formatDate(invoice.due_date)}</td>
        <td>${invoice.status}</td>
        <td>${invoice.currency}</td>
        <td>${Number(invoice.subtotal).toFixed(2)}</td>
        <td>${Number(invoice.tax_amount).toFixed(2)}</td>
        <td>${Number(invoice.discount_amount).toFixed(2)}</td>
        <td>${Number(invoice.total).toFixed(2)}</td>
      </tr>
    `).join("");

    const htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([htmlTable], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices_${new Date().toISOString().split("T")[0]}.xls`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredInvoices.length} invoices to Excel`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "secondary",
      paid: "outline",
      overdue: "destructive",
      cancelled: "secondary",
    };

    // Custom styling for sent status - blue background with appropriate text color
    if (status === "sent") {
      return (
        <Badge variant={variants[status]} className="bg-blue-600 text-white dark:bg-blue-500 dark:text-blue-950 border-transparent">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    }

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track your invoices
          </p>
        </div>
        <Link href="/invoices/new">
          <Button variant="success">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_invoices}</div>
              <p className="text-xs text-muted-foreground">
                {stats.draft_count} drafts, {stats.sent_count} sent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${Number(stats.total_amount || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">All invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${Number(stats.paid_amount || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.paid_count} invoices paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ${Number(stats.outstanding_amount || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.overdue_count} overdue
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Search and filter your invoices</CardDescription>
            </div>
            <div className="flex gap-2">
              {(searchQuery || statusFilter || startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={filteredInvoices.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                disabled={filteredInvoices.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number, client name, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <select
                  value={statusFilter || ""}
                  onChange={(e) => setStatusFilter(e.target.value || null)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {filteredInvoices.length} Invoice{filteredInvoices.length !== 1 ? "s" : ""}
          </CardTitle>
          <CardDescription>
            {searchQuery || statusFilter || startDate || endDate
              ? "Filtered results"
              : "All invoices"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || statusFilter || startDate || endDate
                ? "No invoices match your filters."
                : "No invoices yet. Create your first invoice to get started."}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">
                            Due {formatDate(invoice.due_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.items.length} items
                        </p>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
