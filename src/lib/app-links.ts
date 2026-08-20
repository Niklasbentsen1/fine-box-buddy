/**
 * Downloadlinks til appen.
 *
 * Invitationer sender modtageren direkte til App Store — aldrig til en
 * hjemmeside som mellemstation. Når en Android-version findes, sættes
 * GOOGLE_PLAY_URL blot til den rigtige URL, og resten af appen håndterer
 * automatisk, at der nu er to downloadmuligheder.
 */

/** Erstat med den endelige App Store URL, når appen er godkendt. */
export const APP_STORE_URL = "https://apps.apple.com/dk/app/finebuddy/id0000000000";

/** Der findes endnu ingen Android-version — sæt til Play Store URL'en senere. */
export const GOOGLE_PLAY_URL: string | null = null;

/** Alle downloadlinks, der aktuelt må vises i invitationer. */
export const APP_DOWNLOAD_LINKS: { label: string; url: string }[] = [
  { label: "App Store (iPhone)", url: APP_STORE_URL },
  ...(GOOGLE_PLAY_URL ? [{ label: "Google Play (Android)", url: GOOGLE_PLAY_URL }] : []),
];

/** Primært downloadlink brugt i invitationsbeskeder. */
export const APP_DOWNLOAD_URL = APP_STORE_URL;

/** Custom URL scheme, som iOS/Android-appen er registreret med. */
export const APP_URL_SCHEME = "app.boedekassen";

/**
 * Hvor bekræftelses-mailen sender brugeren hen. På telefonen åbnes appen via
 * dens eget URL-scheme, så man ikke ender i en browser; i web-previewet bruges
 * den nuværende adresse.
 */
export function authEmailRedirectUrl(): string {
  if (typeof window === "undefined") return `${APP_URL_SCHEME}://auth`;
  const isNative =
    Boolean((window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      ?.isNativePlatform?.()) || window.location.protocol === "capacitor:";
  return isNative ? `${APP_URL_SCHEME}://auth` : `${window.location.origin}/auth`;
}
