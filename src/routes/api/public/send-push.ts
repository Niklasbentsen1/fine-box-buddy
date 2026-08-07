import { createFileRoute } from "@tanstack/react-router";

// Kaldes af databasetriggeren dispatch_push_notification, når der oprettes en
// række i notifications-tabellen. Signerer en APNs JWT med .p8-nøglen og sender
// push til alle brugerens registrerede iOS-enheder — også når appen er lukket.

const APNS_HOST = "https://api.push.apple.com";
const BUNDLE_ID = "app.boedekassen";

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function base64url(input: string | ArrayBuffer): string {
  let b64: string;
  if (typeof input === "string") {
    b64 = btoa(input);
  } else {
    const bytes = new Uint8Array(input);
    let s = "";
    for (const byte of bytes) s += String.fromCharCode(byte);
    b64 = btoa(s);
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// APNs provider-tokens må genbruges i op til 60 min — cache mellem kald.
let cached: { jwt: string; issuedAt: number } | null = null;

async function apnsJwt(keyPem: string, keyId: string, teamId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && now - cached.issuedAt < 3000) return cached.jwt;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(keyPem.replace(/\\n/g, "\n")),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = base64url(JSON.stringify({ iss: teamId, iat: now }));
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const jwt = `${header}.${claims}.${base64url(signature)}`;
  cached = { jwt, issuedAt: now };
  return jwt;
}

export const Route = createFileRoute("/api/public/send-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Den delte hemmelighed ligger i databasen (kun tilgængelig for
        // service-rolle og databasens egen trigger), så både preview og
        // den publicerede app bruger samme nøgle.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: configRow } = await supabaseAdmin
          .from("push_config")
          .select("value")
          .eq("key", "hook_secret")
          .maybeSingle();
        if (!configRow || request.headers.get("x-hook-secret") !== configRow.value) {
          return new Response("unauthorized", { status: 401 });
        }

        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const record = (payload["record"] ?? payload) as {
          user_id?: string;
          title?: string;
          body?: string;
        };
        if (!record.user_id) return new Response("missing user_id", { status: 400 });

        // Indtil APNs-nøglerne er lagt ind, svarer vi ok uden at sende noget.
        const apnsKey = process.env["APNS_AUTH_KEY"];
        const apnsKeyId = process.env["APNS_KEY_ID"];
        const apnsTeamId = process.env["APNS_TEAM_ID"];
        if (!apnsKey || !apnsKeyId || !apnsTeamId) {
          return Response.json({ ok: true, sent: 0, reason: "apns_not_configured" });
        }

        const { data: tokens, error } = await supabaseAdmin
          .from("device_tokens")
          .select("id, token")
          .eq("user_id", record.user_id)
          .eq("platform", "ios");

        if (error) return Response.json({ ok: false, reason: error.message }, { status: 500 });
        if (!tokens || tokens.length === 0) return Response.json({ ok: true, sent: 0 });

        const jwt = await apnsJwt(apnsKey, apnsKeyId, apnsTeamId);
        const apnsPayload = JSON.stringify({
          aps: {
            alert: { title: record.title ?? "Bødekassen", body: record.body ?? "" },
            sound: "default",
            "mutable-content": 1,
          },
        });

        const staleIds: string[] = [];
        let sent = 0;

        await Promise.all(
          tokens.map(async ({ id, token }) => {
            try {
              const res = await fetch(`${APNS_HOST}/3/device/${token}`, {
                method: "POST",
                headers: {
                  authorization: `bearer ${jwt}`,
                  "apns-topic": BUNDLE_ID,
                  "apns-push-type": "alert",
                  "apns-priority": "10",
                  "content-type": "application/json",
                },
                body: apnsPayload,
              });
              if (res.status === 200) {
                sent++;
                return;
              }
              const reason = await res.text();
              // Tokenet er ugyldigt (app afinstalleret el.lign.) — fjern det.
              if (
                res.status === 410 ||
                reason.includes("BadDeviceToken") ||
                reason.includes("Unregistered")
              ) {
                staleIds.push(id);
              }
            } catch {
              // Netværksfejl mod APNs for ét token må ikke stoppe de øvrige.
            }
          }),
        );

        if (staleIds.length > 0) {
          await supabaseAdmin.from("device_tokens").delete().in("id", staleIds);
        }

        return Response.json({ ok: true, sent });
      },
    },
  },
});
