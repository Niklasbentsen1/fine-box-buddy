import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Coins, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Vælg ny adgangskode — FineBuddy" },
      {
        name: "description",
        content: "Vælg en ny adgangskode til din FineBuddy-konto.",
      },
      { property: "og:title", content: "Vælg ny adgangskode — FineBuddy" },
      {
        property: "og:description",
        content: "Vælg en ny adgangskode til din FineBuddy-konto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const rules = useMemo(
    () => [
      { label: "Mindst 6 tegn", met: password.length >= 6 },
      { label: "Mindst ét tal", met: /\d/.test(password) },
      { label: "Mindst ét stort bogstav", met: /[A-ZÆØÅ]/.test(password) },
      { label: "Mindst ét lille bogstav", met: /[a-zæøå]/.test(password) },
    ],
    [password],
  );
  const valid = rules.every((r) => r.met);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Din adgangskode er opdateret");
    navigate({ to: "/hjem", replace: true });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center app-backdrop px-safe py-safe">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Coins className="h-6 w-6" />
          </span>
          <p className="font-display text-3xl font-semibold leading-none">FineBuddy</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h1 className="font-display text-2xl font-semibold">Vælg ny adgangskode</h1>
          {!ready ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Åbn linket fra din e-mail for at nulstille adgangskoden. Hvis du allerede har klikket
              på linket, så vent et øjeblik…
            </p>
          ) : null}
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Ny adgangskode</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindst 6 tegn"
                minLength={6}
                required
              />
              <ul className="space-y-1.5 pt-1">
                {rules.map((rule) => (
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
            </div>
            <Button type="submit" className="w-full" disabled={busy || !valid || !ready}>
              {busy ? "Vent et øjeblik…" : "Gem ny adgangskode"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm">
            <button
              type="button"
              className="font-semibold text-pitch hover:underline"
              onClick={() => navigate({ to: "/auth" })}
            >
              Tilbage til log ind
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
