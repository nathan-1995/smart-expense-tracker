"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { documentApi, transactionApi } from "@/lib/api";
import { DocumentExtractionResult, TransactionExtracted, TransactionCreate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { ArrowLeft, Check, Trash2, AlertCircle } from "lucide-react";

export default function ReviewTransactionsPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [extractionResult, setExtractionResult] = useState<DocumentExtractionResult | null>(null);
  const [transactions, setTransactions] = useState<TransactionExtracted[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExtractionResults();
  }, [documentId]);

  const loadExtractionResults = async () => {
    try {
      setLoading(true);
      const result = await documentApi.getExtractionResults(documentId);
      setExtractionResult(result);
      setTransactions(result.transactions || []);
    } catch (error: any) {
      console.error("Failed to load extraction results:", error);
      setError(error.response?.data?.detail || "Failed to load extraction results");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (index: number, field: keyof TransactionExtracted, value: any) => {
    const updated = [...transactions];
    updated[index] = { ...updated[index], [field]: value };
    setTransactions(updated);
  };

  const handleDeleteRow = (index: number) => {
    setTransactions(transactions.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setImportProgress(0);

      // Simulate progress animation
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 150);

      // Convert to TransactionCreate format
      const transactionsToImport: TransactionCreate[] = transactions.map(t => ({
        transaction_date: t.transaction_date,
        description: t.description,
        amount: t.amount,
        transaction_type: t.transaction_type,
        balance_after: t.balance_after || null,
        category: t.category || "uncategorized",
        merchant: t.merchant || null,
        account_last4: t.account_last4 || null,
        notes: t.notes || null,
      }));

      await transactionApi.bulkImportTransactions(documentId, { transactions: transactionsToImport });

      // Complete progress
      clearInterval(progressInterval);
      setImportProgress(100);

      // Wait a moment to show completion
      await new Promise(resolve => setTimeout(resolve, 800));

      // Navigate back to transactions list
      router.push("/transactions");
    } catch (error: any) {
      console.error("Failed to import transactions:", error);
      alert(error.response?.data?.detail || "Failed to import transactions");
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const formatCurrency = (amount: number) => {
    // TODO: Get currency from document's bank account
    // For now, defaulting to LKR for Sri Lankan bank statements
    const currency = "LKR";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Processing document...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error Loading Extraction Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={() => router.push("/transactions")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Transactions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Button variant="ghost" onClick={() => router.push("/transactions")} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transactions
          </Button>
          <h1 className="text-3xl font-bold">Review Extracted Transactions</h1>
          <p className="text-muted-foreground">
            Review and edit the transactions before importing them
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={handleImport} disabled={importing || transactions.length === 0} size="lg" className="relative">
            {!importing && <Check className="mr-2 h-4 w-4" />}
            {importing ? (
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{importProgress}%</span>
              </div>
            ) : (
              `Import ${transactions.length} Transactions`
            )}
          </Button>
          {importing && (
            <TextShimmer
              duration={1.2}
              className="text-sm font-medium [--base-color:theme(colors.blue.600)] [--base-gradient-color:theme(colors.blue.400)]"
            >
              {importProgress < 100 ? "Importing transactions..." : "Import complete!"}
            </TextShimmer>
          )}
        </div>
      </div>

      {/* Metadata */}
      {extractionResult?.metadata && (
        <Card>
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {extractionResult.metadata.account_holder && (
              <div>
                <p className="text-sm text-muted-foreground">Account Holder</p>
                <p className="font-medium">{extractionResult.metadata.account_holder}</p>
              </div>
            )}
            {extractionResult.metadata.account_number_last4 && (
              <div>
                <p className="text-sm text-muted-foreground">Account</p>
                <p className="font-medium">****{extractionResult.metadata.account_number_last4}</p>
              </div>
            )}
            {extractionResult.metadata.statement_period && (
              <div>
                <p className="text-sm text-muted-foreground">Period</p>
                <p className="font-medium">{extractionResult.metadata.statement_period}</p>
              </div>
            )}
            {extractionResult.metadata.total_transactions && (
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="font-medium">{extractionResult.metadata.total_transactions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({transactions.length})</CardTitle>
          <CardDescription>
            Edit any field by clicking on it. Delete rows you don't want to import.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions to import
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Merchant</th>
                    <th className="text-left p-2">Balance</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <Input
                          type="date"
                          value={transaction.transaction_date}
                          onChange={(e) => handleFieldChange(index, "transaction_date", e.target.value)}
                          className="w-40"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={transaction.description}
                          onChange={(e) => handleFieldChange(index, "description", e.target.value)}
                          className="min-w-[200px]"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={transaction.amount}
                          onChange={(e) => handleFieldChange(index, "amount", parseFloat(e.target.value))}
                          className="w-32"
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={transaction.transaction_type}
                          onValueChange={(value) => handleFieldChange(index, "transaction_type", value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debit">Debit</SelectItem>
                            <SelectItem value="credit">Credit</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Select
                          value={transaction.category || "uncategorized"}
                          onValueChange={(value) => handleFieldChange(index, "category", value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="uncategorized">Uncategorized</SelectItem>
                            <SelectItem value="salary">Salary</SelectItem>
                            <SelectItem value="rent">Rent</SelectItem>
                            <SelectItem value="utilities">Utilities</SelectItem>
                            <SelectItem value="food">Food</SelectItem>
                            <SelectItem value="transportation">Transportation</SelectItem>
                            <SelectItem value="entertainment">Entertainment</SelectItem>
                            <SelectItem value="shopping">Shopping</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                            <SelectItem value="business_expense">Business Expense</SelectItem>
                            <SelectItem value="investment">Investment</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          value={transaction.merchant || ""}
                          onChange={(e) => handleFieldChange(index, "merchant", e.target.value)}
                          placeholder="Merchant"
                          className="w-32"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={transaction.balance_after || ""}
                          onChange={(e) => handleFieldChange(index, "balance_after", e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="Balance"
                          className="w-32"
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRow(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Debits</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  transactions
                    .filter(t => t.transaction_type === "debit")
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Credits</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  transactions
                    .filter(t => t.transaction_type === "credit")
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
