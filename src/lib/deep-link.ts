/**
 * Håndtering af links, der åbner appen igen efter en mail-bekræftelse.
 *
 * Bekræftelsesmailen sender brugeren til `app.boedekassen://auth#access_token=…`
 * (eller `?code=…`). På telefonen åbnes appen af iOS/Android uden at ruteren
 * ved noget om adressen, så vi oversætter selv linket til en session og en
 * navigation ind i appen.
 */

import { supabase } from "@/integrations/supabase/client";

export type AuthLinkResult = "confirmed" | "recovery" | "error" | "none";

/** Læser tokens fra både query-strengen og hash-delen af et link. */
function readParams(url: string): URLSearchParams {
  const params = new URLSearchParams();
  const [, rest = ""] = url.split("?");
  const [query = "", hashFromQuery = ""] = rest.split("#");
  const hash = url.includes("#") ? (hashFromQuery || url.split("#")[1] || "") : "";
  for (const part of [query, hash]) {
    if (!part) continue;
    new URLSearchParams(part).forEach((value, key) => params.set(key, value));
  }
  return params;
}

/**
 * Forsøger at logge brugeren ind ud fra et bekræftelses- eller
 * nulstillingslink. Returnerer hvad linket førte til.
 */
export async function handleAuthLink(url: string): Promise<AuthLinkResult> {
  const params = readParams(url);

  if (params.get("error") || params.get("error_description")) return "error";

  const type = params.get("type");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const code = params.get("code");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return "error";
    return type === "recovery" ? "recovery" : "confirmed";
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return "error";
    return type === "recovery" ? "recovery" : "confirmed";
  }

  return "none";
}

/** Fjerner tokens fra browserens adresselinje, så de ikke bliver liggende. */
export function stripAuthParamsFromUrl() {
  if (typeof window === "undefined") return;
  if (!window.location.hash && !window.location.search) return;
  window.history.replaceState({}, "", window.location.pathname);
}

/**
 * Lytter efter links, der åbner appen (Capacitor). Kaldes én gang fra roden.
 */
export function registerAuthDeepLinkListener(
  onResult: (result: AuthLinkResult) => void,
): () => void {
  let cancelled = false;
  let remove: (() => void) | undefined;

  const isNative = Boolean(
    (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      ?.isNativePlatform?.(),
  );
  if (!isNative) return () => {};

  void (async () => {
    try {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("appUrlOpen", ({ url }) => {
        void handleAuthLink(url).then((result) => {
          if (result !== "none") onResult(result);
        });
      });
      if (cancelled) void handle.remove();
      else remove = () => void handle.remove();
    } catch {
      // Capacitor er ikke tilgængelig (fx i webpreview) — intet at gøre.
    }
  })();

  return () => {
    cancelled = true;
    remove?.();
  };
}
