"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { clientApi } from "@/lib/api";
import { Client } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadClients();
  }, [page]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await clientApi.list(page, 20);
      setClients(response.clients);
      setTotalPages(response.total_pages);
    } catch (error: any) {
      // Only show error toast for actual HTTP errors, not empty data
      if (error?.response?.status && error.response.status !== 404) {
        const message = error?.response?.data?.detail || "Failed to load clients";
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-2">
            Manage your clients and their information
          </p>
        </div>
        <Link href="/clients/new">
          <Button variant="success">
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>
            {clients.length > 0
              ? `${clients.length} client${clients.length > 1 ? "s" : ""} found`
              : "No clients yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No clients yet. Add your first client to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        {!client.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {client.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {(client.city || client.country) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {[client.city, client.country].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                      {client.currency && (
                        <div className="text-sm text-muted-foreground">
                          Currency: {client.currency}
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
