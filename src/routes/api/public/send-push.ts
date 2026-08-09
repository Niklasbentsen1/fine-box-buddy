// Server-side afsendelse af native push-notifikationer via APNs (HTTP/2, token-baseret auth).
//
// Kaldes af databasejobbet `dispatch_push_notifications` (hvert minut) eller manuelt.
// Adgang kræver headeren `x-push-secret`, som skal matche serverhemmeligheden
// PUSH_DISPATCH_SECRET. APNs-nøglen forlader aldrig serveren.
//
// Nødvendige serverhemmeligheder: APNS_KEY_ID, APNS_TEAM_ID, APNS_AUTH_KEY,
// PUSH_DISPATCH_SECRET (samt valgfri APNS_BUNDLE_ID, default app.boedekassen).

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const APNS_HOSTS = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.development.push.apple.com",
} as const;

type ApnsEnv = keyof typeof APNS_HOSTS;

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  type: string | null;
};

const PREF_BY_TYPE: Record<string, string> = {
  fine_received: "fine_received",
  payment_approved: "payment_approved",
  payment_rejected: "payment_rejected",
  payment_reminder: "payment_reminder",
  motm_opened: "motm_opened",
  motm_result: "motm_result",
  membership_approved: "membership_approved",
};

function base64url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  const raw = atob(body);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function createApnsJwt(keyId: string, teamId: string, authKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(authKey) as unknown as BufferSource,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const encoder = new TextEncoder();
  const header = base64url(encoder.encode(JSON.stringify({ alg: "ES256", kid: keyId })));
  const payload = base64url(encoder.encode(JSON.stringify({ iss: teamId, iat: now })));
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${base64url(signature)}`;
}

async function pushToDevice(opts: {
  host: string;
  jwt: string;
  bundleId: string;
  token: string;
  notification: NotificationRow;
}): Promise<{ status: number; reason?: string }> {
  const res = await fetch(`${opts.host}/3/device/${opts.token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${opts.jwt}`,
      "apns-topic": opts.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-collapse-id": opts.notification.id.slice(0, 64),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      aps: {
        alert: { title: opts.notification.title, body: opts.notification.body },
        sound: "default",
      },
      link: opts.notification.link,
      type: opts.notification.type,
    }),
  });

  if (res.status === 200) return { status: 200 };
  let reason: string | undefined;
  try {
    reason = ((await res.json()) as { reason?: string }).reason;
  } catch {
    reason = undefined;
  }
  return { status: res.status, reason };
}

export const Route = createFileRoute("/api/public/send-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const dispatchSecret = process.env["PUSH_DISPATCH_SECRET"];
        if (!dispatchSecret || request.headers.get("x-push-secret") !== dispatchSecret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const keyId = process.env["APNS_KEY_ID"];
        const teamId = process.env["APNS_TEAM_ID"];
        const authKey = process.env["APNS_AUTH_KEY"];
        const bundleId = process.env["APNS_BUNDLE_ID"] ?? "app.boedekassen";

        if (!keyId || !teamId || !authKey) {
          return new Response(
            JSON.stringify({
              error: "APNs mangler konfiguration (APNS_KEY_ID, APNS_TEAM_ID, APNS_AUTH_KEY)",
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false } },
        );

        let payload: { notification_ids?: string[] } = {};
        try {
          payload = (await request.json()) as { notification_ids?: string[] };
        } catch {
          payload = {};
        }

        const base = supabase.from("notifications").select("id, user_id, title, body, link, type");
        const { data: notifications, error } = payload.notification_ids?.length
          ? await base.in("id", payload.notification_ids)
          : await base
              .is("pushed_at", null)
              .gte("created_at", new Date(Date.now() - 86_400_000).toISOString())
              .order("created_at", { ascending: true })
              .limit(200);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const rows = (notifications ?? []) as NotificationRow[];
        if (rows.length === 0) {
          return Response.json({ processed: 0, sent: 0 });
        }

        const userIds = [...new Set(rows.map((n) => n.user_id))];

        const { data: tokens } = await supabase
          .from("device_tokens")
          .select("user_id, token, environment")
          .in("user_id", userIds)
          .is("disabled_at", null);

        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("*")
          .in("user_id", userIds);

        const prefByUser = new Map(
          (prefs ?? []).map((p) => [(p as { user_id: string }).user_id, p as Record<string, boolean>]),
        );
        const tokensByUser = new Map<string, { token: string; environment: string }[]>();
        for (const t of (tokens ?? []) as {
          user_id: string;
          token: string;
          environment: string;
        }[]) {
          const list = tokensByUser.get(t.user_id) ?? [];
          list.push({ token: t.token, environment: t.environment });
          tokensByUser.set(t.user_id, list);
        }

        const jwt = await createApnsJwt(keyId, teamId, authKey);
        const processed: string[] = [];
        let sent = 0;

        for (const notification of rows) {
          processed.push(notification.id);

          const pref = prefByUser.get(notification.user_id);
          if (pref && pref["push_enabled"] === false) continue;
          const prefColumn = notification.type ? PREF_BY_TYPE[notification.type] : undefined;
          if (pref && prefColumn && pref[prefColumn] === false) continue;

          for (const device of tokensByUser.get(notification.user_id) ?? []) {
            const order: ApnsEnv[] =
              device.environment === "sandbox"
                ? ["sandbox", "production"]
                : ["production", "sandbox"];

            for (const env of order) {
              const result = await pushToDevice({
                host: APNS_HOSTS[env],
                jwt,
                bundleId,
                token: device.token,
                notification,
              });

              if (result.status === 200) {
                sent++;
                if (device.environment !== env) {
                  await supabase
                    .from("device_tokens")
                    .update({ environment: env, last_seen_at: new Date().toISOString() })
                    .eq("token", device.token);
                }
                break;
              }

              if (result.reason === "BadDeviceToken" || result.reason === "BadEnvironmentKeyInToken") {
                continue; // prøv det andet APNs-miljø
              }

              if (result.status === 410 || result.reason === "Unregistered") {
                await supabase
                  .from("device_tokens")
                  .update({ disabled_at: new Date().toISOString() })
                  .eq("token", device.token);
                break;
              }

              console.error("APNs-fejl", result.status, result.reason);
              break;
            }
          }
        }

        await supabase
          .from("notifications")
          .update({ pushed_at: new Date().toISOString() })
          .in("id", processed);

        return Response.json({ processed: processed.length, sent });
      },
    },
  },
});
