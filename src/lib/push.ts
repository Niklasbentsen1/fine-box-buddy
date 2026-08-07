import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

const ANDROID_CHANNEL_ID = "boedekassen-alerts";

/**
 * Registrerer enhedens APNs-token i databasen, så backend kan sende
 * push-notifikationer, selv når appen er helt lukket. Mens appen er åben,
 * vises modtagne pushes som lokale notifikationer (iOS viser ikke selv
 * bannere for den forreste app). Kalder onRegistered, når tokenet er modtaget.
 */
async function registerRemotePush(userId: string, onRegistered: () => void): Promise<void> {
  if (Capacitor.getPlatform() !== "ios") return;
  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return;

    await PushNotifications.addListener("registration", ({ value }) => {
      onRegistered();
      void supabase
        .from("device_tokens")
        .upsert(
          { user_id: userId, token: value, platform: "ios" },
          { onConflict: "user_id,token" },
        )
        .then(() => undefined);
    });
    await PushNotifications.addListener("registrationError", () => undefined);
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      void LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now() % 2_000_000_000,
            title: notification.title ?? "Bødekassen",
            body: notification.body ?? "",
          },
        ],
      });
    });

    await PushNotifications.register();
  } catch {
    // Remote push ikke tilgængelig (fx simulator) — appen virker stadig uden.
  }
}

/**
 * Viser nye notifikationer fra backend som system-notifikationer på telefonen.
 * På iOS med aktiv remote push leverer APNs-pipelinen (også når appen er
 * lukket); realtime-lytningen er fallback på Android og i browser/udvikling.
 *
 * Returnerer en cleanup-funktion (beregnet til useEffect).
 */
export function initNotificationPush(userId: string): () => void {
  if (!Capacitor.isNativePlatform()) return () => undefined;

  let channel: RealtimeChannel | null = null;
  let cancelled = false;
  let remoteRegistered = false;

  const setup = async () => {
    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== "granted" || cancelled) return;

      if (Capacitor.getPlatform() === "android") {
        await LocalNotifications.createChannel({
          id: ANDROID_CHANNEL_ID,
          name: "Bødekassen",
          description: "Notifikationer fra dine hold i Bødekassen",
          importance: 4, // IMPORTANCE_HIGH
          visibility: 1,
          vibration: true,
        });
      }

      await registerRemotePush(userId, () => {
        remoteRegistered = true;
      });
      if (cancelled) return;

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
            // Når remote push er aktiv på iOS, leverer APNs-pipelinen allerede
            // notifikationen — spring over for at undgå dubletter.
            if (remoteRegistered) return;
            const row = payload.new as { title?: string; body?: string };
            void LocalNotifications.schedule({
              notifications: [
                {
                  id: Date.now() % 2_000_000_000,
                  title: row.title ?? "Bødekassen",
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
      // Push er ikke tilgængelig (fx manglende tilladelse) — appen virker stadig uden.
    }
  };

  void setup();

  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
  };
}
