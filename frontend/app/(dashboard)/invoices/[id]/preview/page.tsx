"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { invoiceApi, settingsApi, clientApi } from "@/lib/api";
import { Invoice, Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function InvoicePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [template, setTemplate] = useState<string>("default");
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");

  useEffect(() => {
    loadData();
  }, [invoiceId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load invoice
      const invoiceData = await invoiceApi.get(invoiceId);
      setInvoice(invoiceData);

      // Load client details
      if (invoiceData.client_id) {
        try {
          const clientData = await clientApi.get(invoiceData.client_id);
          setClient(clientData);
        } catch (error) {
          console.error("Failed to load client:", error);
        }
      }

      // Load user settings
      try {
        const settings = await settingsApi.get();
        setTemplate(settings.default_template || "default");
        setCompanyName(settings.company_name || "");
        setCompanyLogo(settings.company_logo || "");
        setCompanyAddress(settings.company_address || "");
        setCompanyPhone(settings.company_phone || "");
        setCompanyEmail(settings.company_email || "");
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    } catch (error) {
      toast.error("Failed to load invoice");
      router.push("/invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const pdfBlob = await invoiceApi.downloadPDF(invoiceId);

      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice_${invoice?.invoice_number || invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully");
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { detail?: string } } };
      toast.error(apiError.response?.data?.detail || "Failed to download PDF");
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading invoice preview...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Link href={`/invoices/${invoiceId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoice
            </Button>
          </Link>
          <Button onClick={handleDownloadPDF} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* Invoice Preview */}
        <div className="bg-white shadow-lg mx-auto" style={{ width: "816px", minHeight: "1056px" }}>
          {/* A4 size container */}
          <div className="relative" style={{ width: "816px", height: "1056px" }}>

            {/* Modern Green Theme */}
            {template === "modern-green" && (
              <>
                {/* Top green diagonal header */}
                <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-emerald-500 to-emerald-400"
                     style={{ clipPath: 'polygon(0 0, 100% 0, 75% 100%, 0% 100%)' }} />

                {/* Bottom green footer */}
                <div className="absolute bottom-0 left-0 w-full h-20 bg-emerald-500" />

                {/* Company Logo */}
                {companyLogo && (
                  <div className="absolute" style={{ left: '60px', top: '50px', width: '100px', height: '50px' }}>
                    <img src={companyLogo} alt="Company Logo" className="w-full h-full object-contain" />
                  </div>
                )}

                {/* Company Info */}
                <div className="absolute" style={{ left: '60px', top: '180px', width: '200px' }}>
                  <div className="text-gray-900 font-bold text-sm">{companyName || "Your Company Name"}</div>
                  <div className="text-gray-600 text-xs mt-2">{companyAddress || "123 Business Street, City"}</div>
                  <div className="text-gray-600 text-xs">{companyPhone || "(555) 123-4567"}</div>
                  <div className="text-gray-600 text-xs">{companyEmail || "hello@company.com"}</div>
                </div>

                {/* Invoice Title */}
                <div className="absolute" style={{ left: '300px', top: '50px', width: '200px' }}>
                  <div className="text-4xl font-bold text-gray-900 text-center">INVOICE</div>
                </div>

                {/* Client Info */}
                <div className="absolute" style={{ left: '60px', top: '280px', width: '250px' }}>
                  <div className="text-xs font-bold text-gray-900 mb-2">BILL TO:</div>
                  <div className="text-base font-bold text-gray-900">{client?.name || invoice.client_name}</div>
                  {client?.email && <div className="text-sm text-gray-600">{client.email}</div>}
                  {client?.address && <div className="text-sm text-gray-600">{client.address}</div>}
                </div>

                {/* Invoice Details */}
                <div className="absolute" style={{ right: '60px', top: '280px', width: '200px' }}>
                  <div className="text-sm text-gray-600 text-right">Invoice #: <span className="font-semibold text-gray-900">{invoice.invoice_number}</span></div>
                  <div className="text-sm text-gray-600 text-right mt-1">Issue Date: <span className="font-semibold text-gray-900">{formatDate(invoice.issue_date)}</span></div>
                  <div className="text-sm text-gray-600 text-right mt-1">Due Date: <span className="font-semibold text-gray-900">{formatDate(invoice.due_date)}</span></div>
                </div>

                {/* Items Table */}
                <div className="absolute" style={{ left: '60px', right: '60px', top: '380px' }}>
                  {/* Table Header */}
                  <div className="h-11 bg-emerald-600 flex items-center px-4">
                    <div className="flex w-full justify-between text-white font-semibold text-sm">
                      <span style={{flex: 2}}>Description</span>
                      <span style={{flex: 1, textAlign: 'center'}}>Qty</span>
                      <span style={{flex: 1, textAlign: 'center'}}>Rate</span>
                      <span style={{flex: 1, textAlign: 'right'}}>Amount</span>
                    </div>
                  </div>

                  {/* Table Rows */}
                  <div className="border-l border-r border-b border-gray-200">
                    {invoice.items.map((item, index) => (
                      <div key={item.id} className={`flex items-center px-4 py-2.5 ${index < invoice.items.length - 1 ? 'border-b border-gray-200' : ''}`}>
                        <div style={{flex: 2}} className="text-gray-700 text-sm">{item.description}</div>
                        <div style={{flex: 1}} className="text-center text-gray-700 text-sm">{item.quantity}</div>
                        <div style={{flex: 1}} className="text-center text-gray-700 text-sm">{formatCurrency(Number(item.rate), invoice.currency)}</div>
                        <div style={{flex: 1}} className="text-right text-gray-700 text-sm">{formatCurrency(Number(item.amount), invoice.currency)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="absolute right-14 bg-white border border-gray-200 rounded-lg p-4" style={{ top: `${480 + (invoice.items.length * 40)}px`, width: '260px' }}>
                  <div className="flex justify-between text-sm text-gray-700 mb-2">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(Number(invoice.subtotal), invoice.currency)}</span>
                  </div>
                  {(invoice.tax_rate ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-gray-700 mb-2">
                      <span>Tax ({invoice.tax_rate}%):</span>
                      <span className="font-semibold">{formatCurrency(Number(invoice.tax_amount), invoice.currency)}</span>
                    </div>
                  )}
                  {(invoice.discount_amount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-gray-700 mb-3 pb-3 border-b border-gray-300">
                      <span>Discount:</span>
                      <span className="font-semibold text-red-600">-{formatCurrency(Number(invoice.discount_amount), invoice.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-bold text-lg text-gray-900">Total:</span>
                    <span className="font-bold text-2xl text-emerald-600">{formatCurrency(Number(invoice.total), invoice.currency)}</span>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="absolute" style={{ left: '60px', bottom: '140px', width: '400px' }}>
                    <div className="text-xs font-bold text-gray-900 mb-1">Notes:</div>
                    <div className="text-xs text-gray-600 whitespace-pre-wrap">{invoice.notes}</div>
                  </div>
                )}
              </>
            )}

            {/* Geometric Purple Theme */}
            {template === "geometric-purple" && (
              <>
                {/* Top left navy triangle */}
                <div className="absolute top-0 left-0 bg-indigo-950"
                     style={{ width: '80px', height: '108px', clipPath: 'polygon(0 0, 100% 30%, 0 100%)' }} />

                {/* Top navy bar with diagonal cut */}
                <div className="absolute top-0 left-0 w-full h-12 bg-indigo-900"
                     style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 25% 100%, 20% 85%, 15% 70%, 10% 50%, 5% 30%, 0 0)' }} />

                {/* Top purple accent bar */}
                <div className="absolute top-3 left-1/4 bg-violet-500"
                     style={{ width: '380px', height: '28px', clipPath: 'polygon(0 0, 95% 0, 100% 100%, 5% 100%)' }} />

                {/* Company Logo */}
                {companyLogo && (
                  <div className="absolute" style={{ left: '60px', top: '50px', width: '100px', height: '50px' }}>
                    <img src={companyLogo} alt="Company Logo" className="w-full h-full object-contain" />
                  </div>
                )}

                {/* Invoice Title */}
                <div className="absolute" style={{ left: '300px', top: '130px', width: '200px' }}>
                  <div className="text-5xl font-bold text-gray-900 text-center">Invoice</div>
                </div>

                {/* Client Info */}
                <div className="absolute" style={{ left: '60px', top: '250px', width: '250px' }}>
                  <div className="text-xs font-bold text-gray-900 mb-2">INVOICE TO:</div>
                  <div className="text-base font-bold text-gray-900 mb-2">{client?.name || invoice.client_name}</div>
                  {client?.email && <div className="text-sm text-gray-600">{client.email}</div>}
                  {client?.address && <div className="text-sm text-gray-600">{client.address}</div>}
                </div>

                {/* Invoice Details */}
                <div className="absolute" style={{ left: '300px', top: '250px', width: '150px' }}>
                  <div className="text-xs text-gray-600 text-center mb-1">Date: <span className="font-semibold text-gray-900">{formatDate(invoice.issue_date)}</span></div>
                  <div className="text-xs text-gray-600 text-center">Invoice No: <span className="font-semibold text-gray-900">{invoice.invoice_number}</span></div>
                </div>

                {/* Total Due */}
                <div className="absolute" style={{ right: '60px', top: '250px', width: '180px' }}>
                  <div className="text-xs font-bold text-gray-900 mb-1 text-right">TOTAL DUE:</div>
                  <div className="text-base font-bold text-gray-900 text-right">{invoice.currency}: {formatCurrency(Number(invoice.total), invoice.currency)}</div>
                </div>

                {/* Items Table */}
                <div className="absolute" style={{ left: '60px', right: '60px', top: '360px' }}>
                  {/* Table Header */}
                  <div className="h-11 bg-indigo-800 flex items-center px-4">
                    <div className="flex w-full justify-between text-white font-semibold text-sm">
                      <span style={{flex: 2}}>Description</span>
                      <span style={{flex: 1, textAlign: 'center'}}>Qty</span>
                      <span style={{flex: 1, textAlign: 'center'}}>Price</span>
                      <span style={{flex: 1, textAlign: 'right'}}>Total</span>
                    </div>
                  </div>

                  {/* Table Rows */}
                  <div className="border-l border-r border-b border-gray-200">
                    {invoice.items.map((item, index) => (
                      <div key={item.id} className={`flex items-center px-4 py-2.5 ${index < invoice.items.length - 1 ? 'border-b border-gray-200' : ''}`}>
                        <div style={{flex: 2}} className="text-gray-700 text-sm">{item.description}</div>
                        <div style={{flex: 1}} className="text-center text-gray-700 text-sm">{item.quantity}</div>
                        <div style={{flex: 1}} className="text-center text-gray-700 text-sm">{formatCurrency(Number(item.rate), invoice.currency)}</div>
                        <div style={{flex: 1}} className="text-right text-gray-700 text-sm">{formatCurrency(Number(item.amount), invoice.currency)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="absolute" style={{ right: '60px', top: `${460 + (invoice.items.length * 40)}px`, width: '240px' }}>
                  <div className="flex justify-between text-sm text-gray-700 mb-2">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(Number(invoice.subtotal), invoice.currency)}</span>
                  </div>
                  {(invoice.tax_rate ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-gray-700 mb-2">
                      <span>Tax ({invoice.tax_rate}%):</span>
                      <span>{formatCurrency(Number(invoice.tax_amount), invoice.currency)}</span>
                    </div>
                  )}
                  {(invoice.discount_amount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-gray-700 mb-3 pb-3 border-b border-gray-300">
                      <span>Discount:</span>
                      <span>-{formatCurrency(Number(invoice.discount_amount), invoice.currency)}</span>
                    </div>
                  )}
                </div>

                {/* Total section with background */}
                <div className="absolute right-14 bg-indigo-800 text-white px-6 py-3"
                     style={{ top: `${548 + (invoice.items.length * 40)}px`, width: '240px' }}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="font-bold text-2xl">{formatCurrency(Number(invoice.total), invoice.currency)}</span>
                  </div>
                </div>

                {/* Bottom geometric shapes */}
                <div className="absolute bottom-0 left-0 bg-violet-600"
                     style={{ width: '180px', height: '45px', clipPath: 'polygon(0 100%, 100% 50%, 100% 100%)' }} />

                <div className="absolute bottom-0 left-44 bg-violet-500"
                     style={{ width: '330px', height: '70px', clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)' }} />

                <div className="absolute bottom-0 right-0 bg-indigo-900"
                     style={{ width: '100%', height: '52px', clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 0 100%, 0 60%)' }} />

                {/* Notes */}
                {invoice.notes && (
                  <div className="absolute" style={{ left: '60px', bottom: '140px', width: '400px' }}>
                    <div className="text-xs font-bold text-gray-900 mb-1">Notes:</div>
                    <div className="text-xs text-gray-600 whitespace-pre-wrap">{invoice.notes}</div>
                  </div>
                )}
              </>
            )}

            {/* Default/Modern Theme */}
            {(template === "default" || template === "modern") && (
              <div className="p-16">
                {/* Company Logo */}
                {companyLogo && (
                  <div className="mb-6">
                    <img src={companyLogo} alt="Company Logo" className="h-16 object-contain" />
                  </div>
                )}

                {/* Header */}
                <div className="flex justify-between mb-8">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">INVOICE</h1>
                    <div className="text-sm text-gray-600">
                      <div className="font-bold text-gray-900">{companyName || "Your Company Name"}</div>
                      <div>{companyAddress || "123 Business Street, City"}</div>
                      <div>{companyPhone || "(555) 123-4567"}</div>
                      <div>{companyEmail || "hello@company.com"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-2">
                      <div>Invoice #: <span className="font-semibold text-gray-900">{invoice.invoice_number}</span></div>
                      <div>Issue Date: <span className="font-semibold text-gray-900">{formatDate(invoice.issue_date)}</span></div>
                      <div>Due Date: <span className="font-semibold text-gray-900">{formatDate(invoice.due_date)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Bill To */}
                <div className="mb-8">
                  <div className="text-xs font-bold text-gray-900 mb-2">BILL TO:</div>
                  <div className="text-base font-bold text-gray-900">{client?.name || invoice.client_name}</div>
                  {client?.email && <div className="text-sm text-gray-600">{client.email}</div>}
                  {client?.address && <div className="text-sm text-gray-600">{client.address}</div>}
                </div>

                {/* Items Table */}
                <div className="mb-8">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Description</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Qty</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Rate</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={item.id} className={index < invoice.items.length - 1 ? 'border-b border-gray-200' : ''}>
                          <td className="py-3 px-4 text-gray-700 text-sm">{item.description}</td>
                          <td className="text-center py-3 px-4 text-gray-700 text-sm">{item.quantity}</td>
                          <td className="text-center py-3 px-4 text-gray-700 text-sm">{formatCurrency(Number(item.rate), invoice.currency)}</td>
                          <td className="text-right py-3 px-4 text-gray-700 text-sm">{formatCurrency(Number(item.amount), invoice.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 bg-gray-50 border border-gray-200 rounded p-4">
                    <div className="flex justify-between text-sm text-gray-700 mb-2">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(Number(invoice.subtotal), invoice.currency)}</span>
                    </div>
                    {(invoice.tax_rate ?? 0) > 0 && (
                      <div className="flex justify-between text-sm text-gray-700 mb-2">
                        <span>Tax ({invoice.tax_rate}%):</span>
                        <span className="font-semibold">{formatCurrency(Number(invoice.tax_amount), invoice.currency)}</span>
                      </div>
                    )}
                    {(invoice.discount_amount ?? 0) > 0 && (
                      <div className="flex justify-between text-sm text-gray-700 mb-3 pb-3 border-b border-gray-300">
                        <span>Discount:</span>
                        <span className="font-semibold text-red-600">-{formatCurrency(Number(invoice.discount_amount), invoice.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="font-bold text-lg text-gray-900">Total:</span>
                      <span className="font-bold text-2xl text-blue-600">{formatCurrency(Number(invoice.total), invoice.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="mt-8">
                    <div className="text-sm font-bold text-gray-900 mb-2">Notes:</div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</div>
                  </div>
                )}

                {/* Terms */}
                {invoice.terms && (
                  <div className="mt-6">
                    <div className="text-sm font-bold text-gray-900 mb-2">Terms & Conditions:</div>
                    <div className="text-xs text-gray-600 whitespace-pre-wrap">{invoice.terms}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
