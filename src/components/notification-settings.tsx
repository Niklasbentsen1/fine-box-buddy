import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  enablePushNotifications,
  getPushPermission,
  isPushSupported,
  type PushPermission,
} from "@/lib/push";

type PrefKey =
  | "push_enabled"
  | "fine_received"
  | "payment_approved"
  | "payment_rejected"
  | "payment_reminder"
  | "motm_opened"
  | "motm_result"
  | "membership_approved";

type Prefs = Record<PrefKey, boolean>;

const DEFAULTS: Prefs = {
  push_enabled: true,
  fine_received: true,
  payment_approved: true,
  payment_rejected: true,
  payment_reminder: true,
  motm_opened: true,
  motm_result: true,
  membership_approved: true,
};

const TYPE_LABELS: { key: PrefKey; label: string }[] = [
  { key: "fine_received", label: "Ny bøde til mig" },
  { key: "payment_approved", label: "Min indbetaling er godkendt" },
  { key: "payment_rejected", label: "Min indbetaling er afvist" },
  { key: "payment_reminder", label: "Påmindelse om betaling" },
  { key: "motm_opened", label: "Afstemning om kampens spiller er åbnet" },
  { key: "motm_result", label: "Resultat af afstemning" },
  { key: "membership_approved", label: "Jeg er godkendt på et hold" },
];

export function NotificationSettings({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<PushPermission>("unsupported");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getPushPermission().then(setPermission);
  }, []);

  const { data: prefs = DEFAULTS } = useQuery({
    queryKey: ["notification-preferences", userId],
    queryFn: async (): Promise<Prefs> => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return { ...DEFAULTS, ...(data ?? {}) } as Prefs;
    },
  });

  const update = async (key: PrefKey, value: boolean) => {
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ ...prefs, user_id: userId, [key]: value }, { onConflict: "user_id" });
    if (error) {
      toast.error("Kunne ikke gemme indstillingen");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["notification-preferences", userId] });
  };

  const handleEnable = async () => {
    setBusy(true);
    const result = await enablePushNotifications(userId);
    setBusy(false);
    setPermission(result);
    if (result === "granted") toast.success("Notifikationer er slået til på denne enhed");
    else if (result === "denied")
      toast.error("Notifikationer er slået fra for Bødekassen i iPhonens Indstillinger");
  };

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        <Bell className="h-5 w-5 text-muted-foreground" /> Notifikationer
      </h2>

      {!isPushSupported() ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Push-notifikationer virker i Bødekassen-appen på iPhone og Android.
        </p>
      ) : permission === "granted" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Denne enhed modtager notifikationer — også når appen er lukket.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            {permission === "denied"
              ? "Notifikationer er slået fra for Bødekassen. Slå dem til under iPhonens Indstillinger → Bødekassen → Notifikationer."
              : "Slå notifikationer til, så du får besked om bøder, indbetalinger og afstemninger."}
          </p>
          {permission !== "denied" && (
            <Button onClick={handleEnable} disabled={busy}>
              Slå notifikationer til
            </Button>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Push-notifikationer</span>
          <Switch
            checked={prefs.push_enabled}
            onCheckedChange={(v) => void update("push_enabled", v)}
          />
        </div>
        {TYPE_LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{label}</span>
            <Switch
              checked={prefs[key]}
              disabled={!prefs.push_enabled}
              onCheckedChange={(v) => void update(key, v)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
