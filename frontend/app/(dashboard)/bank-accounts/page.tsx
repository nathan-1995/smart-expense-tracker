"use client";

import { useState, useEffect } from "react";
import { bankAccountApi } from "@/lib/api";
import { BankAccount, AccountType, Currency } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, CreditCard, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export default function BankAccountsPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    account_name: "",
    bank_name: "",
    account_number_last4: "",
    account_type: "savings" as AccountType,
    currency: "LKR" as Currency,
    opening_balance: "",
  });

  useEffect(() => {
    loadBankAccounts();

    // Check if #add hash is present to open create dialog
    if (window.location.hash === '#add') {
      setIsCreateDialogOpen(true);
      // Clear the hash
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      const response = await bankAccountApi.getBankAccounts();
      setBankAccounts(response.bank_accounts);
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to load bank accounts";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      const data = {
        account_name: formData.account_name,
        bank_name: formData.bank_name,
        account_number_last4: formData.account_number_last4 || null,
        account_type: formData.account_type,
        currency: formData.currency,
        opening_balance: formData.opening_balance ? parseFloat(formData.opening_balance) : null,
      };

      await bankAccountApi.createBankAccount(data);
      toast.success("Bank account created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      loadBankAccounts();
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to create bank account";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingAccount) return;

    try {
      setIsSubmitting(true);
      const data = {
        account_name: formData.account_name,
        bank_name: formData.bank_name,
        account_number_last4: formData.account_number_last4 || null,
        account_type: formData.account_type,
        currency: formData.currency,
        opening_balance: formData.opening_balance ? parseFloat(formData.opening_balance) : null,
      };

      await bankAccountApi.updateBankAccount(editingAccount.id, data);
      toast.success("Bank account updated successfully");
      setIsEditDialogOpen(false);
      setEditingAccount(null);
      resetForm();
      loadBankAccounts();
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to update bank account";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (accountId: string, accountName: string) => {
    if (!confirm(`Are you sure you want to delete "${accountName}"? This will also delete all associated transactions and documents.`)) {
      return;
    }

    try {
      await bankAccountApi.deleteBankAccount(accountId);
      toast.success("Bank account deleted successfully");
      loadBankAccounts();
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to delete bank account";
      toast.error(message);
    }
  };

  const openEditDialog = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      account_name: account.account_name,
      bank_name: account.bank_name,
      account_number_last4: account.account_number_last4 || "",
      account_type: account.account_type,
      currency: account.currency,
      opening_balance: account.opening_balance?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      account_name: "",
      bank_name: "",
      account_number_last4: "",
      account_type: "savings",
      currency: "LKR",
      opening_balance: "",
    });
  };

  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const accountTypeLabels: Record<AccountType, string> = {
    savings: "Savings",
    current: "Current",
    credit_card: "Credit Card",
    investment: "Investment",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bank Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage your bank accounts and track transactions
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} variant="success">
          <Plus className="mr-2 h-4 w-4" />
          Add Bank Account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bank Accounts</CardTitle>
          <CardDescription>
            {bankAccounts.length > 0
              ? `${bankAccounts.length} bank account${bankAccounts.length > 1 ? "s" : ""} found`
              : "No bank accounts yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : bankAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bank accounts yet. Add your first bank account to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankAccounts.map((account) => (
                <Card key={account.id} className="hover:bg-accent transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          {account.account_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{account.bank_name}</p>
                      </div>
                      {!account.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium">{accountTypeLabels[account.account_type]}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Currency:</span>
                        <span className="font-medium">{account.currency}</span>
                      </div>
                      {account.account_number_last4 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Account:</span>
                          <span className="font-mono">****{account.account_number_last4}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Balance:</span>
                        <span className="font-semibold">
                          {formatCurrency(account.current_balance, account.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(account)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(account.id, account.account_name)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>
              Create a new bank account to track your transactions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="account_name">Account Name *</Label>
              <Input
                id="account_name"
                placeholder="e.g., My Personal Savings"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Input
                id="bank_name"
                placeholder="e.g., Commercial Bank of Ceylon"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account_type">Account Type *</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData({ ...formData, account_type: value as AccountType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value as Currency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                  <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account_number_last4">Last 4 Digits (Optional)</Label>
              <Input
                id="account_number_last4"
                placeholder="1234"
                maxLength={4}
                value={formData.account_number_last4}
                onChange={(e) => setFormData({ ...formData, account_number_last4: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="opening_balance">Opening Balance (Optional)</Label>
              <Input
                id="opening_balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.account_name || !formData.bank_name || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Bank Account</DialogTitle>
            <DialogDescription>
              Update your bank account information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_account_name">Account Name *</Label>
              <Input
                id="edit_account_name"
                placeholder="e.g., My Personal Savings"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_bank_name">Bank Name *</Label>
              <Input
                id="edit_bank_name"
                placeholder="e.g., Commercial Bank of Ceylon"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_account_type">Account Type *</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData({ ...formData, account_type: value as AccountType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_currency">Currency *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value as Currency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                  <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_account_number_last4">Last 4 Digits (Optional)</Label>
              <Input
                id="edit_account_number_last4"
                placeholder="1234"
                maxLength={4}
                value={formData.account_number_last4}
                onChange={(e) => setFormData({ ...formData, account_number_last4: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_opening_balance">Opening Balance (Optional)</Label>
              <Input
                id="edit_opening_balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIsEditDialogOpen(false); setEditingAccount(null); resetForm(); }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!formData.account_name || !formData.bank_name || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
