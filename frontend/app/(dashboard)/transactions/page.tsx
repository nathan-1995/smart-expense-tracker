"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { documentApi, transactionApi, bankAccountApi } from "@/lib/api";
import { Transaction, TransactionStats, Document, BankAccount } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, TrendingUp, TrendingDown, DollarSign, Filter, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { toast } from "sonner";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import FileUpload from "@/components/ui/file-upload";

export default function TransactionsPage() {
  const router = useRouter();
  const { subscribe } = useWebSocketContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Bank account selection
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(true);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Email notification preference
  const [emailNotification, setEmailNotification] = useState(false);

  // Processing notification modal
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);

  // Upload progress states
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Pending documents
  const [pendingDocuments, setPendingDocuments] = useState<Document[]>([]);

  // How It Works modal
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    loadTransactions();
    loadStats();
    loadBankAccounts();
    loadPendingDocuments();

    // Subscribe to WebSocket document completion notifications
    const unsubscribe = subscribe((message) => {
      if (message.type === 'document_completed') {
        // Show toast notification
        toast.success("Bank statement is ready!", {
          action: {
            label: "Review",
            onClick: () => router.push(`/transactions/review/${message.document_id}`)
          }
        });

        // Reload pending documents to show the completed one
        loadPendingDocuments();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [page, filterType, filterCategory, subscribe, router]);

  const loadBankAccounts = async () => {
    try {
      setBankAccountsLoading(true);
      const accounts = await bankAccountApi.getActiveBankAccounts();
      setBankAccounts(accounts);
    } catch (error) {
      console.error("Failed to load bank accounts:", error);
    } finally {
      setBankAccountsLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params: any = { page, page_size: 50 };
      if (filterType !== "all") params.transaction_type = filterType;
      if (filterCategory !== "all") params.category = filterCategory;

      const response = await transactionApi.listTransactions(params);
      setTransactions(response.transactions);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await transactionApi.getTransactionStats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadPendingDocuments = async () => {
    try {
      const response = await documentApi.listDocuments({
        status_filter: "pending,processing,completed",
        page_size: 10
      });

      // Show all pending, processing, and completed documents
      // WebSocket handles real-time notifications, so no need to check for newly completed
      setPendingDocuments(response.documents);
    } catch (error) {
      console.error("Failed to load pending documents:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Wait for bank accounts to finish loading if they're still loading
    if (bankAccountsLoading) {
      toast.info("Loading bank accounts, please wait...");
      event.target.value = "";
      return;
    }

    // Check if user has bank accounts
    if (bankAccounts.length === 0) {
      toast.error("Please create a bank account first before uploading statements");
      router.push("/bank-accounts");
      return;
    }

    // Store file and open dialog to select bank account
    setPendingFile(file);
    setIsAccountDialogOpen(true);

    // Reset the input so the same file can be selected again
    event.target.value = "";
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile || !selectedBankAccountId) return;

    try {
      setUploading(true);
      setIsUploadingFile(true);
      setUploadProgress(0);

      // Simulate file reading progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const document = await documentApi.uploadDocument(
        pendingFile,
        "bank_statement",
        selectedBankAccountId,
        emailNotification
      );

      // Complete progress
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Wait a moment to show 100%
      await new Promise(resolve => setTimeout(resolve, 500));

      // Close account dialog and reset upload progress
      setIsAccountDialogOpen(false);
      setIsUploadingFile(false);
      setUploadProgress(0);

      toast.success("Bank statement uploaded successfully");

      // Show processing modal
      setIsProcessingModalOpen(true);

      // Reload pending documents
      loadPendingDocuments();
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error.response?.data?.detail || "Failed to upload document");
      setIsUploadingFile(false);
      setUploadProgress(0);
    } finally {
      setUploading(false);
      setPendingFile(null);
      setSelectedBankAccountId("");
      setEmailNotification(false);
    }
  };

  const handleUploadFromModal = async () => {
    if (selectedFiles.length === 0 || !selectedBankAccountId) {
      toast.error("Please select files and a bank account");
      return;
    }

    try {
      setUploading(true);
      setIsUploadingFile(true);
      setUploadProgress(0);

      // Upload all selected files
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Simulate file reading progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);

        await documentApi.uploadDocument(
          file,
          "bank_statement",
          selectedBankAccountId,
          emailNotification
        );

        clearInterval(progressInterval);
      }

      // Complete progress
      setUploadProgress(100);

      // Wait a moment to show 100%
      await new Promise(resolve => setTimeout(resolve, 500));

      // Close upload modal and reset
      setIsUploadModalOpen(false);
      setIsUploadingFile(false);
      setUploadProgress(0);
      setSelectedFiles([]);

      toast.success(`${selectedFiles.length} bank statement(s) uploaded successfully`);

      // Show processing modal
      setIsProcessingModalOpen(true);

      // Reload pending documents
      loadPendingDocuments();
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error.response?.data?.detail || "Failed to upload document");
      setIsUploadingFile(false);
      setUploadProgress(0);
    } finally {
      setUploading(false);
      setSelectedBankAccountId("");
      setEmailNotification(false);
    }
  };

  const formatCurrency = (amount: number) => {
    // Use the first bank account's currency, or USD as fallback
    const currency = bankAccounts.length > 0 ? bankAccounts[0].currency : "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const handleDismissDocument = async (documentId: string) => {
    try {
      // Delete the document from the database (also deletes associated transactions via CASCADE)
      await documentApi.deleteDocument(documentId);

      // Remove from the UI immediately
      setPendingDocuments(pendingDocuments.filter(doc => doc.id !== documentId));

      toast.success("Document deleted successfully");
    } catch (error: any) {
      console.error("Failed to delete document:", error);
      toast.error(error.response?.data?.detail || "Failed to delete document");
    }
  };

  const handleDownloadSample = () => {
    // Simple direct link download - let the browser handle it naturally
    const link = document.createElement('a');
    link.href = '/sample-bank-statement.pdf';
    link.download = 'sample-bank-statement.pdf';
    link.setAttribute('type', 'application/pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Sample bank statement download started!");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            Upload bank statements and manage your transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsHowItWorksOpen(true)}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            How It Works
          </Button>
          <Button
            disabled={uploading}
            onClick={() => {
              // Check if user has bank accounts before opening modal
              if (bankAccountsLoading) {
                toast.info("Loading bank accounts, please wait...");
                return;
              }
              if (bankAccounts.length === 0) {
                toast.error("Please create a bank account first before uploading statements");
                router.push("/bank-accounts");
                return;
              }
              setIsUploadModalOpen(true);
            }}
          >
            {uploading ? (
              <>Processing...</>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Bank Statement
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Pending Documents List */}
      {pendingDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Document Processing ({pendingDocuments.length})
            </CardTitle>
            <CardDescription>
              Track your document processing status and review completed documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    doc.status === "completed"
                      ? "bg-green-50 border-green-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {doc.status === "completed" ? (
                      <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <FileText className="h-5 w-5 text-blue-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{doc.original_filename}</p>
                      <p className={`text-sm capitalize ${
                        doc.status === "completed" ? "text-green-700 font-medium" : "text-gray-600"
                      }`}>
                        {doc.status === "completed" ? "Ready for review" : doc.status === "processing" ? "Processing..." : "In queue..."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.status === "completed" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => router.push(`/transactions/review/${doc.id}`)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Review
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDismissDocument(doc.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Dismiss
                        </Button>
                      </>
                    ) : doc.status === "processing" ? (
                      <svg className="h-4 w-4 text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_transactions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total_debits} debits, {stats.total_credits} credits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.total_credit_amount)}
              </div>
              <p className="text-xs text-muted-foreground">{stats.total_credits} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.total_debit_amount)}
              </div>
              <p className="text-xs text-muted-foreground">{stats.total_debits} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.net_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(stats.net_balance)}
              </div>
              <p className="text-xs text-muted-foreground">Credits - Debits</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
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

          <Button variant="outline" onClick={() => { setFilterType("all"); setFilterCategory("all"); }}>
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found. Upload a bank statement to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Merchant</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-right p-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{formatDate(transaction.transaction_date)}</td>
                      <td className="p-2">{transaction.description}</td>
                      <td className="p-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {transaction.category}
                        </span>
                      </td>
                      <td className="p-2 text-muted-foreground">{transaction.merchant || "-"}</td>
                      <td className={`p-2 text-right font-medium ${
                        transaction.transaction_type === "credit" ? "text-green-600" : "text-red-600"
                      }`}>
                        {transaction.transaction_type === "credit" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {transaction.balance_after ? formatCurrency(transaction.balance_after) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Bank Statement Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={!isUploadingFile ? setIsUploadModalOpen : undefined}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isUploadingFile ? "Uploading Bank Statement" : "Upload Bank Statement"}
            </DialogTitle>
            <DialogDescription>
              {isUploadingFile
                ? "Please wait while we upload your files..."
                : "Select a bank account and upload your PDF bank statement(s)"}
            </DialogDescription>
          </DialogHeader>

          {isUploadingFile ? (
            <div className="grid gap-4 py-6">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div className="flex-1">
                  <TextShimmer
                    duration={1.2}
                    className="text-sm font-medium [--base-color:theme(colors.blue.600)] [--base-gradient-color:theme(colors.blue.400)]"
                  >
                    {uploadProgress < 100 ? "Uploading files..." : "Upload complete!"}
                  </TextShimmer>
                  <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 py-4">
              {/* Bank Account Selection */}
              <div className="grid gap-2">
                <Label htmlFor="bank-account-modal">Select Bank Account *</Label>
                <Select
                  value={selectedBankAccountId}
                  onValueChange={setSelectedBankAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose which bank account this statement belongs to" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} - {account.bank_name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File Upload Component */}
              <div>
                <FileUpload
                  onFilesChange={setSelectedFiles}
                  accept="application/pdf"
                  maxFiles={10}
                />
              </div>

              {/* Email Notification */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="email-notification-modal"
                  checked={emailNotification}
                  onChange={(e) => setEmailNotification(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="email-notification-modal" className="text-sm font-normal cursor-pointer">
                  Email me when processing is complete
                </Label>
              </div>
            </div>
          )}

          {!isUploadingFile && (
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsUploadModalOpen(false);
                setSelectedFiles([]);
                setSelectedBankAccountId("");
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleUploadFromModal}
                disabled={!selectedBankAccountId || selectedFiles.length === 0 || uploading}
              >
                Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`} Statement{selectedFiles.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Bank Account Selection Dialog */}
      <Dialog open={isAccountDialogOpen} onOpenChange={!isUploadingFile ? setIsAccountDialogOpen : undefined}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isUploadingFile ? "Uploading Bank Statement" : "Select Bank Account"}
            </DialogTitle>
            <DialogDescription>
              {isUploadingFile
                ? "Please wait while we upload your file..."
                : "Choose which bank account this statement belongs to"}
            </DialogDescription>
          </DialogHeader>

          {isUploadingFile ? (
            <div className="grid gap-4 py-6">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div className="flex-1">
                  <TextShimmer
                    duration={1.2}
                    className="text-sm font-medium [--base-color:theme(colors.blue.600)] [--base-gradient-color:theme(colors.blue.400)]"
                  >
                    {uploadProgress < 100 ? "Uploading file..." : "Upload complete!"}
                  </TextShimmer>
                  <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="bank-account">Bank Account *</Label>
                <Select
                  value={selectedBankAccountId}
                  onValueChange={setSelectedBankAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} - {account.bank_name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="email-notification"
                  checked={emailNotification}
                  onChange={(e) => setEmailNotification(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="email-notification" className="text-sm font-normal cursor-pointer">
                  Email me when processing is complete
                </Label>
              </div>
            </div>
          )}

          {!isUploadingFile && (
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAccountDialogOpen(false);
                setPendingFile(null);
                setSelectedBankAccountId("");
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUpload}
                disabled={!selectedBankAccountId || uploading}
              >
                Upload Statement
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Processing Notification Modal */}
      <Dialog open={isProcessingModalOpen} onOpenChange={setIsProcessingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processing Your Bank Statement</DialogTitle>
            <DialogDescription>
              <TextShimmer
                duration={1.5}
                className="text-sm [--base-color:theme(colors.blue.600)] [--base-gradient-color:theme(colors.blue.400)]"
              >
                Your bank statement is being processed in the background...
              </TextShimmer>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                You can close this dialog and continue using the app. We'll notify you when processing is complete.
              </p>
            </div>
            {emailNotification && (
              <div className="flex items-start space-x-3 bg-blue-50 p-3 rounded-md">
                <svg className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                <p className="text-sm text-blue-700">
                  You'll receive an email notification when the processing is complete.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsProcessingModalOpen(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* How It Works Modal */}
      <Dialog open={isHowItWorksOpen} onOpenChange={setIsHowItWorksOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <HelpCircle className="h-6 w-6 text-blue-500" />
              How It Works
            </DialogTitle>
            <DialogDescription>
              Learn how to upload and process bank statements in FinTrack
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Upload Your Bank Statement</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Click the "Upload Bank Statement" button and select a PDF file from your computer.
                  Choose which bank account this statement belongs to.
                </p>
                <p className="text-sm text-muted-foreground">
                  Optionally, enable email notifications to get notified when processing is complete.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Automatic Processing</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Your bank statement is processed in the background using AI to extract transactions.
                  This usually takes 1-2 minutes.
                </p>
                <p className="text-sm text-muted-foreground">
                  You can navigate away and continue using the app while processing happens.
                  Check the "Document Processing" card at the top to track progress.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Review Extracted Transactions</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Once processing is complete, click "Review" to see the extracted transactions.
                  You'll see a table with dates, descriptions, amounts, and categories.
                </p>
                <p className="text-sm text-muted-foreground">
                  You can edit any transaction details, delete unwanted entries, or add notes before importing.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Import to Your Account</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  When you're satisfied with the transactions, click "Import" to save them to your account.
                  They will appear in your transactions list and be included in your financial reports.
                </p>
                <p className="text-sm text-muted-foreground">
                  You can review and reimport the same document multiple times. Each import will replace the previous one.
                </p>
              </div>
            </div>

            {/* Sample Download Section */}
            <div className="border-t pt-6 mt-6">
              <h3 className="font-semibold text-lg mb-3">Try It Yourself</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Download our sample bank statement to test the upload and processing workflow.
                This sample file contains realistic transaction data you can experiment with.
              </p>
              <Button
                onClick={handleDownloadSample}
                variant="outline"
                className="w-full"
              >
                <FileText className="mr-2 h-4 w-4" />
                Download Sample Bank Statement
              </Button>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 text-blue-900">Tips for Best Results</h4>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Use clear, readable PDF bank statements</li>
                <li>Make sure the PDF is not password protected</li>
                <li>Review extracted transactions before importing</li>
                <li>You can reimport to fix any mistakes</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsHowItWorksOpen(false)}>
              Got it, thanks!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
