import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Mail, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { authEmailRedirectUrl } from "@/lib/app-links";
import { handleAuthLink, stripAuthParamsFromUrl } from "@/lib/deep-link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authIllustration from "@/assets/auth-illustration.jpg";
import fineBuddyLogo from "@/assets/finebuddy-logo.png.asset.json";

const REMEMBERED_EMAIL_KEY = "boedekassen:remembered-email";
const KEEP_LOGGED_IN_KEY = "boedekassen:keep-logged-in";
const SESSION_ALIVE_KEY = "boedekassen:session-alive";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log ind — Bødekassen" },
      {
        name: "description",
        content: "Log ind eller opret dig i Bødekassen og få styr på klubbens bødekasse.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [resetSent, setResetSent] = useState(false);


  const passwordRules = useMemo(() => {
    return [
      { label: "Mindst 6 tegn", met: password.length >= 6 },
      { label: "Mindst ét tal", met: /\d/.test(password) },
      { label: "Mindst ét stort bogstav", met: /[A-ZÆØÅ]/.test(password) },
      { label: "Mindst ét lille bogstav", met: /[a-zæøå]/.test(password) },
    ];
  }, [password]);

  const passwordIsValid = passwordRules.every((r: { met: boolean }) => r.met);

  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (remembered) setEmail(remembered);
  }, []);

  // Kommer brugeren hertil fra "Bekræft min mail"-knappen i mailen, ligger
  // tokens i adressen — så logger vi ind og siger tillykke i stedet for at
  // bede om adgangskoden igen.
  useEffect(() => {
    const url = window.location.href;
    if (!/access_token=|(\?|&|#)code=|error_description=/.test(url)) return;
    void handleAuthLink(url).then((result) => {
      stripAuthParamsFromUrl();
      if (result === "recovery") {
        navigate({ to: "/reset-password", replace: true });
        return;
      }
      if (result === "confirmed") {
        toast.success("Din mail er bekræftet — velkommen til!");
        navigate({ to: "/hjem", replace: true });
        return;
      }
      if (result === "error") {
        toast.error("Linket er udløbet eller allerede brugt. Log ind for at fortsætte.");
      }
    });
  }, [navigate]);

  useEffect(() => {
    const mustSignOut =
      window.localStorage.getItem(KEEP_LOGGED_IN_KEY) === "0" &&
      !window.sessionStorage.getItem(SESSION_ALIVE_KEY);
    if (mustSignOut) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/hjem", replace: true });
    });
  }, [navigate]);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResetSent(true);
  };


  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: authEmailRedirectUrl(),
          data: { display_name: displayName.trim() },
        },
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.session) {
        navigate({ to: "/hjem" });
        return;
      }
      setSignedUp(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setBusy(false);
      if (error) {
        toast.error(
          error.message === "Invalid login credentials"
            ? "Forkert e-mail eller adgangskode"
            : error.message,
        );
        return;
      }
      if (rememberMe) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      window.localStorage.setItem(KEEP_LOGGED_IN_KEY, stayLoggedIn ? "1" : "0");
      navigate({ to: "/hjem" });
    }
  };

  return (
    <div className="grid min-h-dvh app-backdrop lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <img
          src={authIllustration}
          alt="Sparegris med mønter — Bødekassen"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-primary-foreground">
          <p className="font-display text-4xl font-semibold leading-tight">
            Hele klubbens bødekasse — samlet ét sted
          </p>
          <p className="mt-3 max-w-md text-sm text-primary-foreground/85">
            Uddel bøder, følg indbetalinger, send påmindelser og kår kampens spiller — for alle
            dine hold og klubber.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center px-safe pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <img
              src={fineBuddyLogo.url}
              alt="FineBuddy logo"
              className="h-14 w-auto object-contain"
            />
            <div>
              <p className="font-display text-3xl font-semibold leading-none">Bødekassen</p>
              <p className="text-sm text-muted-foreground">Din klubs bødekasse, samlet ét sted</p>
            </div>
          </div>

          {mode === "forgot" ? (
            <div className="rounded-2xl border bg-card p-6 shadow-card">
              {resetSent ? (
                <div className="text-center">
                  <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pitch-soft text-pitch">
                    <Mail className="h-6 w-6" />
                  </span>
                  <h1 className="font-display text-2xl font-semibold">Tjek din indbakke</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Hvis der findes en konto med <strong>{email}</strong>, har vi sendt et link,
                    hvor du kan vælge en ny adgangskode.
                  </p>
                </div>
              ) : (
                <>
                  <h1 className="font-display text-2xl font-semibold">Glemt adgangskode</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Indtast din e-mail, så sender vi dig et link til at vælge en ny adgangskode. Af
                    sikkerhedsgrunde kan din nuværende adgangskode ikke sendes.
                  </p>
                  <form onSubmit={handleForgot} className="mt-5 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">E-mail</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dig@eksempel.dk"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? "Vent et øjeblik…" : "Send nulstillingslink"}
                    </Button>
                  </form>
                </>
              )}
              <Button
                variant="outline"
                className="mt-6 w-full"
                onClick={() => {
                  setResetSent(false);
                  setMode("login");
                }}
              >
                Tilbage til log ind
              </Button>
            </div>
          ) : signedUp ? (

            <div className="rounded-2xl border bg-card p-6 text-center shadow-card">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pitch-soft text-pitch">
                <Mail className="h-6 w-6" />
              </span>
              <h1 className="font-display text-2xl font-semibold">Tjek din indbakke</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Vi har sendt en bekræftelsesmail til <strong>{email}</strong>. Klik på linket i
                mailen — knappen "Bekræft min mail" sender dig direkte tilbage til appen, hvor du kan
                logge ind.
              </p>
              <Button
                variant="outline"
                className="mt-6 w-full"
                onClick={() => {
                  setSignedUp(false);
                  setMode("login");
                }}
              >
                Tilbage til log ind
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-6 shadow-card">
              <h1 className="font-display text-2xl font-semibold">
                {mode === "login" ? "Log ind" : "Opret bruger"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "login"
                  ? "Velkommen tilbage — log ind for at se din saldo."
                  : "Opret dig som bruger, og tilmeld dig din klub med en klubkode."}
              </p>

              <form onSubmit={handleEmail} className="mt-5 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Navn</Label>
                    <Input
                      id="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Fx Anders Hansen"
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dig@eksempel.dk"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Adgangskode</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mindst 6 tegn"
                    minLength={6}
                    required
                  />
                  {mode === "signup" && (
                    <ul className="space-y-1.5 pt-1">
                      {passwordRules.map((rule) => (
                        <li key={rule.label} className="flex items-center gap-2 text-xs">
                          {rule.met ? (
                            <Check className="h-3.5 w-3.5 text-pitch" aria-hidden />
                          ) : (
                            <X className="h-3.5 w-3.5 text-destructive" aria-hidden />
                          )}
                          <span className={rule.met ? "text-pitch" : "text-muted-foreground"}>
                            {rule.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {mode === "login" && (
                  <div className="space-y-2.5">
                    <label
                      htmlFor="remember-me"
                      className="flex cursor-pointer items-center gap-2.5 text-sm"
                    >
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(v) => setRememberMe(v === true)}
                      />
                      Husk mig
                    </label>
                    <label
                      htmlFor="stay-logged-in"
                      className="flex cursor-pointer items-center gap-2.5 text-sm"
                    >
                      <Checkbox
                        id="stay-logged-in"
                        checked={stayLoggedIn}
                        onCheckedChange={(v) => setStayLoggedIn(v === true)}
                      />
                      Forbliv logget ind
                    </label>
                    <button
                      type="button"
                      className="text-sm font-semibold text-pitch hover:underline"
                      onClick={() => {
                        setResetSent(false);
                        setMode("forgot");
                      }}
                    >
                      Glemt adgangskode?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={busy || (mode === "signup" && !passwordIsValid)}
                >
                  {busy ? "Vent et øjeblik…" : mode === "login" ? "Log ind" : "Opret bruger"}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                {mode === "login" ? "Ny i klubben?" : "Har du allerede en bruger?"}{" "}
                <button
                  type="button"
                  className="font-semibold text-pitch hover:underline"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                >
                  {mode === "login" ? "Opret dig her" : "Log ind her"}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
