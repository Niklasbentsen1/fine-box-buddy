import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

const ANDROID_CHANNEL_ID = "boedekassen-alerts";

/**
 * Viser nye notifikationer fra backend som lokale system-notifikationer på
 * telefonen, mens appen er åben (realtime-lytning på notifications-tabellen).
 *
 * Returnerer en cleanup-funktion (beregnet til useEffect).
 */
export function initNotificationPush(userId: string): () => void {
  if (!Capacitor.isNativePlatform()) return () => undefined;

  let channel: RealtimeChannel | null = null;
  let cancelled = false;

  const setup = async () => {
    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== "granted" || cancelled) return;

      if (Capacitor.getPlatform() === "android") {
        await LocalNotifications.createChannel({
          id: ANDROID_CHANNEL_ID,
          name: "FineBuddy",
          description: "Notifikationer fra dine hold i FineBuddy",
          importance: 4, // IMPORTANCE_HIGH
          visibility: 1,
          vibration: true,
        });
      }

      const realtimeChannel = supabase
        .channel(`push-notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as { title?: string; body?: string };
            void LocalNotifications.schedule({
              notifications: [
                {
                  id: Date.now() % 2_000_000_000,
                  title: row.title ?? "FineBuddy",
                  body: row.body ?? "",
                  channelId: ANDROID_CHANNEL_ID,
                },
              ],
            });
          },
        )
        .subscribe();

      if (cancelled) {
        void supabase.removeChannel(realtimeChannel);
      } else {
        channel = realtimeChannel;
      }
    } catch {
      // Notifikationer er ikke tilgængelige (fx manglende tilladelse) — appen virker stadig uden.
    }
  };

  void setup();

  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
  };
}
