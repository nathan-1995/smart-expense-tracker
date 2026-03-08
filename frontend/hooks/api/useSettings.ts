import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";
import type { UserSettings, UserSettingsUpdate } from "@/lib/types";
import { toast } from "sonner";

export const settingsKeys = {
  all: ["settings"] as const,
  user: () => [...settingsKeys.all, "user"] as const,
};

export function useUserSettings() {
  return useQuery({
    queryKey: settingsKeys.user(),
    queryFn: () => settingsApi.get(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserSettingsUpdate) => settingsApi.update(data),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(settingsKeys.user(), updatedSettings);
      toast.success("Settings updated successfully");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to update settings";
      toast.error(message);
    },
  });
}
