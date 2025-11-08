"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { invoiceApi, clientApi } from "@/lib/api";
import { Invoice, Client } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Send, DollarSign, Calendar, User, FileText } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await invoiceApi.get(invoiceId);
      setInvoice(data);

      // Load client details
      if (data.client_id) {
        try {
          const clientData = await clientApi.get(data.client_id);
          setClient(clientData);
        } catch (error) {
          console.error("Failed to load client:", error);
        }
      }
    } catch (error) {
      toast.error("Failed to load invoice");
      router.push("/invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);
      await invoiceApi.delete(invoiceId);
      toast.success("Invoice deleted successfully");
      router.push("/invoices");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to delete invoice");
      setDeleting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: "draft" | "sent" | "paid" | "overdue" | "cancelled") => {
    try {
      const updated = await invoiceApi.updateStatus(invoiceId, newStatus);
      setInvoice(updated);
      toast.success(`Invoice status updated to ${newStatus}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to update status");
    }
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
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Button>
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-3xl font-bold">{invoice.invoice_number}</h1>
            {getStatusBadge(invoice.status)}
          </div>
          <p className="text-muted-foreground mt-2">
            Invoice details and status
          </p>
        </div>

        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <Button onClick={() => handleUpdateStatus("sent")} variant="outline">
              <Send className="mr-2 h-4 w-4" />
              Mark as Sent
            </Button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <Button
              onClick={() => handleUpdateStatus("paid")}
              variant="outline"
              className="hover:bg-green-600 hover:text-white hover:border-green-600 dark:hover:bg-green-600 dark:hover:text-white dark:hover:border-green-600 transition-colors"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Mark as Paid
            </Button>
          )}
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Invoice Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(invoice.total, invoice.currency)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Issue Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {formatDate(invoice.issue_date)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {formatDate(invoice.due_date)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Information */}
        {client && (
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{client.name}</p>
                </div>
                {client.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                )}
                {client.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                )}
                {client.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {client.address}
                      {client.city && `, ${client.city}`}
                      {client.country && `, ${client.country}`}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
            <CardDescription>Line items for this invoice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Description</th>
                      <th className="text-right py-2 px-4">Quantity</th>
                      <th className="text-right py-2 px-4">Rate</th>
                      <th className="text-right py-2 px-4">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3 px-4">{item.description}</td>
                        <td className="text-right py-3 px-4">{item.quantity}</td>
                        <td className="text-right py-3 px-4">
                          {formatCurrency(item.rate, invoice.currency)}
                        </td>
                        <td className="text-right py-3 px-4 font-medium">
                          {formatCurrency(item.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-full md:w-1/2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">
                        {formatCurrency(invoice.subtotal, invoice.currency)}
                      </span>
                    </div>

                    {invoice.tax_rate && invoice.tax_rate > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Tax ({invoice.tax_rate}%):
                          </span>
                          <span className="font-medium">
                            {formatCurrency(invoice.tax_amount, invoice.currency)}
                          </span>
                        </div>
                      </>
                    )}

                    {invoice.discount_amount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount:</span>
                        <span className="font-medium">
                          -{formatCurrency(invoice.discount_amount, invoice.currency)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(invoice.total, invoice.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        {(invoice.notes || invoice.terms) && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Terms & Conditions</p>
                  <p className="whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Information */}
        {invoice.status === "paid" && invoice.payment_date && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">{formatDate(invoice.payment_date)}</p>
                </div>
                {invoice.payment_method && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <p className="font-medium">{invoice.payment_method}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
