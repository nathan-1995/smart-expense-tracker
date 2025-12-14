"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, bannerApi } from "@/lib/api";
import {
  AdminUser,
  AdminStatistics,
  SystemBanner,
  BannerType,
  SystemBannerCreate,
  AdminUserUpdate,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  Users,
  Shield,
  Lock,
  Unlock,
  Trash2,
  X,
  Plus,
  Edit,
  Info,
  AlertTriangle,
  XCircle,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "banners">("overview");

  // Statistics
  const [stats, setStats] = useState<AdminStatistics | null>(null);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSkip, setUsersSkip] = useState(0);
  const [usersLimit] = useState(50);
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "verified" | "unverified" | "locked">("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Banners
  const [banners, setBanners] = useState<SystemBanner[]>([]);
  const [bannersTotal, setBannersTotal] = useState(0);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState<SystemBanner | null>(null);
  const [newBanner, setNewBanner] = useState<SystemBannerCreate>({
    message: "",
    banner_type: "info",
    show_to_unverified_only: false,
    is_dismissible: true,
  });

  // Loading states
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);
  const [dataLoaded, setDataLoaded] = useState({
    stats: false,
    users: false,
    banners: false,
  });

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const data = await adminApi.getStatistics();
      setStats(data);
      setDataLoaded(prev => ({ ...prev, stats: true }));
    } catch (error) {
      toast.error("Failed to fetch statistics");
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const params: any = { skip: usersSkip, limit: usersLimit };

      if (userSearch) params.search = userSearch;
      if (userFilter === "verified") params.is_verified = true;
      if (userFilter === "unverified") params.is_verified = false;

      const data = await adminApi.listUsers(params);
      setUsers(data.users);
      setUsersTotal(data.total);
      setDataLoaded(prev => ({ ...prev, users: true }));
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch banners
  const fetchBanners = async () => {
    setIsLoadingBanners(true);
    try {
      const data = await bannerApi.listBanners({ skip: 0, limit: 100 });
      setBanners(data.banners);
      setBannersTotal(data.total);
      setDataLoaded(prev => ({ ...prev, banners: true }));
    } catch (error) {
      toast.error("Failed to fetch banners");
    } finally {
      setIsLoadingBanners(false);
    }
  };

  // Initial load - only load stats immediately
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchStats();
      setIsInitialLoad(false);
    };
    loadInitialData();
  }, []);

  // Load data when switching tabs (only if not already loaded)
  useEffect(() => {
    if (isInitialLoad) return;

    if (activeTab === "users" && !dataLoaded.users) {
      fetchUsers();
    } else if (activeTab === "banners" && !dataLoaded.banners) {
      fetchBanners();
    }
  }, [activeTab, isInitialLoad]);

  // Reload users when filters change (only if on users tab)
  useEffect(() => {
    if (activeTab === "users" && !isInitialLoad && dataLoaded.users) {
      fetchUsers();
    }
  }, [userSearch, userFilter, usersSkip]);

  // Auto-refresh banners every 60 seconds when on banners tab (as backup to event system)
  useEffect(() => {
    if (activeTab === "banners") {
      const interval = setInterval(() => {
        fetchBanners();
      }, 60000); // 60 seconds

      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // User actions
  const handleUnlockUser = async (userId: string) => {
    try {
      await adminApi.unlockUser(userId);
      toast.success("User unlocked successfully");
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error("Failed to unlock user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      await adminApi.deleteUser(userId);
      toast.success("User deleted successfully");
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to delete user");
    }
  };

  const handleUpdateUser = async (userId: string, data: AdminUserUpdate) => {
    try {
      await adminApi.updateUser(userId, data);
      toast.success("User updated successfully");
      setIsEditingUser(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  // Banner actions
  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bannerApi.createBanner(newBanner);
      toast.success("Banner created successfully");
      setIsCreatingBanner(false);
      setNewBanner({
        message: "",
        banner_type: "info",
        show_to_unverified_only: false,
        is_dismissible: true,
      });
      fetchBanners();
      fetchStats();

      // Notify other components that banners have been updated
      window.dispatchEvent(new Event("bannersUpdated"));
    } catch (error) {
      toast.error("Failed to create banner");
    }
  };

  const handleToggleBanner = async (bannerId: string, isActive: boolean) => {
    try {
      await bannerApi.updateBanner(bannerId, { is_active: !isActive });
      toast.success(`Banner ${!isActive ? "activated" : "deactivated"}`);
      fetchBanners();
      fetchStats();

      // Notify other components that banners have been updated
      window.dispatchEvent(new Event("bannersUpdated"));
    } catch (error) {
      toast.error("Failed to toggle banner");
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;

    try {
      await bannerApi.deleteBanner(bannerId);
      toast.success("Banner deleted successfully");
      fetchBanners();
      fetchStats();

      // Notify other components that banners have been updated
      window.dispatchEvent(new Event("bannersUpdated"));
    } catch (error) {
      toast.error("Failed to delete banner");
    }
  };

  const getBannerColor = (type: BannerType) => {
    switch (type) {
      case "info": return "bg-blue-500";
      case "success": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "error": return "bg-red-500";
      case "maintenance": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getBannerIcon = (type: BannerType) => {
    switch (type) {
      case "info": return <Info className="h-4 w-4" />;
      case "success": return <CheckCircle className="h-4 w-4" />;
      case "warning": return <AlertTriangle className="h-4 w-4" />;
      case "error": return <XCircle className="h-4 w-4" />;
      case "maintenance": return <Settings className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users and system settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
          <Button variant="destructive" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 border-b-2 ${activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 border-b-2 ${activeTab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab("banners")}
          className={`px-4 py-2 border-b-2 ${activeTab === "banners" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
        >
          System Banners
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.total_users}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified Users</p>
                <p className="text-2xl font-bold">{stats.verified_users}</p>
                <p className="text-xs text-green-600">
                  {Math.round((stats.verified_users / stats.total_users) * 100)}% verified
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Locked Accounts</p>
                <p className="text-2xl font-bold">{stats.locked_users}</p>
              </div>
              <Lock className="h-8 w-8 text-red-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{stats.superusers}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">New Users</p>
              <div className="space-y-1">
                <p className="text-sm">Today: <span className="font-semibold">{stats.users_created_today}</span></p>
                <p className="text-sm">This Week: <span className="font-semibold">{stats.users_created_this_week}</span></p>
                <p className="text-sm">This Month: <span className="font-semibold">{stats.users_created_this_month}</span></p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Banners</p>
                <p className="text-2xl font-bold">{stats.active_banners}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div>
          {/* Filters */}
          <Card className="p-4 mb-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <Select value={userFilter} onValueChange={(v: any) => setUserFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="verified">Verified Only</SelectItem>
                  <SelectItem value="unverified">Unverified Only</SelectItem>
                  <SelectItem value="locked">Locked Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Users Table */}
          {isLoadingUsers ? (
            <Card className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            </Card>
          ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left">Email</th>
                    <th className="p-4 text-left">Name</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Last Login</th>
                    <th className="p-4 text-left">Account Age</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        {u.email}
                        {u.is_superuser && <Badge className="ml-2" variant="secondary">Admin</Badge>}
                      </td>
                      <td className="p-4">{u.first_name} {u.last_name}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {u.is_verified ? (
                            <Badge variant="default">Verified</Badge>
                          ) : (
                            <Badge variant="secondary">Unverified</Badge>
                          )}
                          {!u.is_active && <Badge variant="destructive">Inactive</Badge>}
                          {u.is_locked && <Badge variant="destructive">Locked</Badge>}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}
                      </td>
                      <td className="p-4 text-sm">{u.account_age_days} days</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {u.is_locked && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnlockUser(u.id)}
                            >
                              <Unlock className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setIsEditingUser(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {u.id !== user?.id && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(u.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          )}

          {!isLoadingUsers && (
            <p className="text-sm text-muted-foreground mt-4">
              Showing {users.length} of {usersTotal} users
            </p>
          )}
        </div>
      )}

      {/* Banners Tab */}
      {activeTab === "banners" && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">System Banners</h2>
            <Button onClick={() => setIsCreatingBanner(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Banner
            </Button>
          </div>

          {/* Create Banner Form */}
          {isCreatingBanner && (
            <Card className="p-6 mb-4">
              <h3 className="text-lg font-semibold mb-4">Create New Banner</h3>
              <form onSubmit={handleCreateBanner} className="space-y-4">
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={newBanner.message}
                    onChange={(e) => setNewBanner({ ...newBanner, message: e.target.value })}
                    required
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Banner Type</Label>
                    <Select
                      value={newBanner.banner_type}
                      onValueChange={(v: BannerType) => setNewBanner({ ...newBanner, banner_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="unverified-only"
                      checked={newBanner.show_to_unverified_only}
                      onChange={(e) => setNewBanner({ ...newBanner, show_to_unverified_only: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="unverified-only">Show to unverified users only</Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Create Banner</Button>
                  <Button type="button" variant="outline" onClick={() => setIsCreatingBanner(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Banners List */}
          {isLoadingBanners ? (
            <Card className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
                <p className="text-muted-foreground">Loading banners...</p>
              </div>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {banners.map((banner) => (
                  <Card key={banner.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded ${getBannerColor(banner.banner_type)} text-white`}>
                        {getBannerIcon(banner.banner_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={banner.is_active ? "bg-green-600" : "bg-gray-400"}>
                            {banner.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">{banner.banner_type}</Badge>
                          {banner.show_to_unverified_only && (
                            <Badge variant="secondary">Unverified Only</Badge>
                          )}
                        </div>
                        <p className="text-sm mb-2">{banner.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(banner.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleBanner(banner.id, banner.is_active)}
                        >
                          {banner.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteBanner(banner.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {banners.length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No banners created yet</p>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Edit User Dialog (simplified - you can enhance with a proper dialog component) */}
      {isEditingUser && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit User: {selectedUser.email}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data: AdminUserUpdate = {
                  first_name: formData.get("first_name") as string,
                  last_name: formData.get("last_name") as string,
                  business_name: formData.get("business_name") as string || undefined,
                  phone: formData.get("phone") as string || undefined,
                };
                handleUpdateUser(selectedUser.id, data);
              }}
              className="space-y-4"
            >
              <div>
                <Label>First Name</Label>
                <Input name="first_name" defaultValue={selectedUser.first_name || ""} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input name="last_name" defaultValue={selectedUser.last_name || ""} />
              </div>
              <div>
                <Label>Business Name</Label>
                <Input name="business_name" defaultValue={selectedUser.business_name || ""} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input name="phone" defaultValue={selectedUser.phone || ""} />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Save Changes</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditingUser(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
