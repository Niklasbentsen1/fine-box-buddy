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
