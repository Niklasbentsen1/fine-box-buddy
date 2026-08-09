import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

const ANDROID_CHANNEL_ID = "boedekassen-alerts";
const PERMISSION_ASKED_KEY = "boedekassen:push-permission-asked";

export type PushPermission = "granted" | "denied" | "prompt" | "unsupported";

export function isPushSupported(): boolean {
  return Capacitor.isNativePlatform();
}

/** Læser den nuværende tilladelse uden at spørge brugeren. */
export async function getPushPermission(): Promise<PushPermission> {
  if (!isPushSupported()) return "unsupported";
  try {
    const { receive } = await PushNotifications.checkPermissions();
    if (receive === "granted") return "granted";
    if (receive === "denied") return "denied";
    return "prompt";
  } catch {
    return "unsupported";
  }
}

async function ensureAndroidChannel() {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await LocalNotifications.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: "Bødekassen",
      description: "Notifikationer fra dine hold i Bødekassen",
      importance: 4,
      visibility: 1,
      vibration: true,
    });
  } catch {
    // kanalen findes allerede eller understøttes ikke
  }
}

async function saveDeviceToken(userId: string, token: string) {
  const platform = Capacitor.getPlatform();
  const { error } = await supabase.from("device_tokens").upsert(
    {
      user_id: userId,
      token,
      platform,
      environment: "production",
      last_seen_at: new Date().toISOString(),
      disabled_at: null,
    },
    { onConflict: "token" },
  );
  if (error) console.error("Kunne ikke gemme enhedens push-token", error.message);
}

/**
 * Beder om tilladelse (kun hvis brugeren ikke allerede har taget stilling) og
 * registrerer enheden hos APNs/FCM. Returnerer den resulterende tilladelse.
 */
export async function enablePushNotifications(userId: string): Promise<PushPermission> {
  if (!isPushSupported()) return "unsupported";

  let state = await getPushPermission();

  if (state === "prompt") {
    // Spørg kun én gang af sig selv — brugeren kan altid trykke igen i Indstillinger.
    const { receive } = await PushNotifications.requestPermissions();
    state = receive === "granted" ? "granted" : receive === "denied" ? "denied" : "prompt";
    try {
      localStorage.setItem(PERMISSION_ASKED_KEY, "1");
    } catch {
      /* ignoreres */
    }
  }

  if (state !== "granted") return state;

  await ensureAndroidChannel();
  await PushNotifications.register();

  await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId, push_enabled: true }, { onConflict: "user_id" });

  return "granted";
}

export function hasAskedForPushPermission(): boolean {
  try {
    return localStorage.getItem(PERMISSION_ASKED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Sætter native push op for den aktuelle bruger:
 *  - gemmer/opdaterer enhedens APNs-token (flere enheder pr. bruger understøttes)
 *  - viser notifikationer mens appen er åben
 *  - navigerer til det relevante skærmbillede når en notifikation trykkes
 *
 * Hvis native push ikke er tilgængeligt (eller ikke tilladt), falder vi tilbage
 * til den eksisterende realtime-baserede lokale notifikation.
 *
 * Returnerer en cleanup-funktion (beregnet til useEffect).
 */
export function initNotificationPush(userId: string, onOpenLink?: (link: string) => void) {
  if (!Capacitor.isNativePlatform()) return () => undefined;

  let channel: RealtimeChannel | null = null;
  let cancelled = false;

  const setup = async () => {
    try {
      await ensureAndroidChannel();

      const permission = await getPushPermission();
      if (cancelled) return;

      if (permission === "granted") {
        // --- Native push (virker også i baggrunden og når appen er lukket) ---
        await PushNotifications.removeAllListeners();

        await PushNotifications.addListener("registration", (t) => {
          void saveDeviceToken(userId, t.value);
        });

        await PushNotifications.addListener("registrationError", (err) => {
          console.error("Push-registrering fejlede", err);
        });

        await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const link = (action.notification.data as { link?: string } | undefined)?.link;
          if (link && onOpenLink) onOpenLink(link);
        });

        await PushNotifications.register();
        return;
      }

      // --- Fallback: appen er åben, men enheden er ikke registreret til push ---
      const localPermission = await LocalNotifications.requestPermissions();
      if (localPermission.display !== "granted" || cancelled) return;

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
      // Notifikationer er ikke tilgængelige — appen virker stadig uden.
    }
  };

  void setup();

  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
  };
}
