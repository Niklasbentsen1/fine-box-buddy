import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/lib/team";
import { formatDate, formatKr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/boeder")({
  head: () => ({
    meta: [
      { title: "Bøder — Bødekassen" },
      { name: "description", content: "Bødesatser og uddelte bøder på holdet." },
    ],
  }),
  component: BoederPage,
});

type FineTypeRow = { id: string; label: string; amount: number };

type FineRow = {
  id: string;
  label: string;
  amount: number;
  created_at: string;
  profiles: { display_name: string } | null;
};

type SortOption = "newest" | "price-asc" | "price-desc" | "label-asc" | "label-desc";

function BoederPage() {
  const { current, isAdmin } = useTeam();
  const queryClient = useQueryClient();
  const teamId = current?.teamId;

  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const { data: fineTypes = [] } = useQuery({
    queryKey: ["team", teamId, "fine-types"],
    enabled: !!teamId,
    queryFn: async (): Promise<FineTypeRow[]> => {
      const { data, error } = await supabase
        .from("fine_types")
        .select("id, label, amount")
        .eq("team_id", teamId!)
        .order("amount", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FineTypeRow[];
    },
  });

  const { data: fines = [] } = useQuery({
    queryKey: ["team", teamId, "all-fines"],
    enabled: !!teamId,
    queryFn: async (): Promise<FineRow[]> => {
      const { data, error } = await supabase
        .from("fines")
        .select("id, label, amount, created_at, profiles(display_name)")
        .eq("team_id", teamId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as FineRow[];
    },
  });

  const sortedFines = useMemo(() => {
    const list = [...fines];
    switch (sortBy) {
      case "price-asc":
        return list.sort((a, b) => a.amount - b.amount);
      case "price-desc":
        return list.sort((a, b) => b.amount - a.amount);
      case "label-asc":
        return list.sort((a, b) => a.label.localeCompare(b.label, "da"));
      case "label-desc":
        return list.sort((a, b) => b.label.localeCompare(a.label, "da"));
      case "newest":
      default:
        return list.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
  }, [fines, sortBy]);

  if (!current || !teamId) return null;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["team", teamId] });

  const handleAddType = async () => {
    const value = Number(amount.replace(",", "."));
    if (!label.trim() || !value || value <= 0) {
      toast.error("Udfyld både bøde og beløb");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("fine_types")
      .insert({ team_id: teamId, label: label.trim(), amount: value });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bødesats tilføjet");
    setAddOpen(false);
    setLabel("");
    setAmount("");
    await refresh();
  };

  const handleDeleteType = async (id: string) => {
    const { error } = await supabase.from("fine_types").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bødesats fjernet");
    await refresh();
  };

  const handleDeleteFine = async (id: string) => {
    const { error } = await supabase.from("fines").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bøde slettet");
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">Bøder</h1>
          <p className="mt-1 text-muted-foreground">
            Bødesatser og uddelte bøder for {current.teamName}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Ny bødesats
          </Button>
        )}
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-xl font-semibold">Bødesatser</h2>
        {fineTypes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {isAdmin
              ? "Ingen bødesatser endnu. Tilføj den første — fx “For sent fremmødt, 20 kr.”"
              : "Holdet har ikke oprettet bødesatser endnu."}
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {fineTypes.map((type) => (
              <li
                key={type.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{type.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="gold">{formatKr(Number(type.amount))}</Badge>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteType(type.id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Slet ${type.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Uddelte bøder</h2>
          <Ticket className="h-5 w-5 text-muted-foreground" />
        </div>
        {fines.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Ingen bøder uddelt endnu.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {fines.map((fine) => (
              <li key={fine.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {fine.profiles?.display_name ?? "Ukendt"} · {fine.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(fine.created_at)}</p>
                </div>
                <Badge variant="navy">{formatKr(Number(fine.amount))}</Badge>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteFine(fine.id)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Slet bøde"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Ny bødesats</DialogTitle>
            <DialogDescription>
              Bødesatsen kan bruges, når du uddeler bøder til holdet.
            </DialogDescription>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type-label">Bøde</Label>
              <Input
                id="type-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Fx For sent fremmødt"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-amount">Beløb (kr.)</Label>
              <Input
                id="type-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Fx 20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Annuller
            </Button>
            <Button onClick={handleAddType} disabled={busy || !label.trim() || !amount.trim()}>
              Tilføj bødesats
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
