import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarOff,
  Camera,
  Check,
  ChevronRight,
  Copy,
  ImageIcon,
  KeyRound,
  Pencil,
  Plus,
  Smartphone,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam, useTeamInviteCode, type Membership } from "@/lib/team";
import { ImageCropper } from "@/components/image-cropper";
import { formatKr, sumAmounts } from "@/lib/format";
import { useConfirm } from "@/components/confirm-dialog";
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

export const Route = createFileRoute("/_authenticated/indstillinger")({
  head: () => ({
    meta: [
      { title: "Indstillinger — FineBuddy" },
      {
        name: "description",
        content:
          "Vælg klub og hold, og administrer MobilePay-nummer, klubkode og sæson for dit hold.",
      },
    ],
  }),
  component: IndstillingerPage,
});

type PaymentSum = { amount: number; status: string };
type WithdrawalSum = { amount: number };

type ClubGroup = { clubId: string; clubName: string; logoUrl: string | null; teams: Membership[] };

/** Holdets egen tilknytningskode — kun synlig for holdets administratorer. */
function TeamInviteCode({ teamId, teamName }: { teamId: string; teamName: string }) {
  const code = useTeamInviteCode(teamId);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(
        `Tilmeld dig holdet ${teamName} med koden ${code}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Kunne ikke kopiere koden");
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/60 px-3 py-2">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Holdets tilknytningskode
        </p>
        <p className="font-mono text-base font-bold tracking-[0.25em]">{code ?? "…"}</p>
      </div>
      <Button variant="subtle" size="sm" onClick={copy} disabled={!code}>
        {copied ? <Check className="mr-2 h-4 w-4 text-pitch" /> : <Copy className="mr-2 h-4 w-4" />}
        {copied ? "Kopieret" : "Kopiér kode"}
      </Button>
    </div>
  );
}

type ClubTeamCountRow = {
  team_id: string;
  team_name: string;
  member_count: number;
};

/** Read-only oversigt over alle hold i brugerens klubber — kun holdnavn og medlemstal. */
function OtherTeamsOverview() {
  const { memberships } = useTeam();
  const clubs = useMemo(() => {
    const map = new Map<string, { clubId: string; clubName: string; logoUrl: string | null }>();
    for (const m of memberships) {
      if (!map.has(m.clubId)) {
        map.set(m.clubId, { clubId: m.clubId, clubName: m.clubName, logoUrl: m.clubLogoUrl });
      }
    }
    return [...map.values()];
  }, [memberships]);
  const clubIds = clubs.map((c) => c.clubId);

  const { data: teamsByClub = {} } = useQuery({
    queryKey: ["club-team-member-counts", clubIds],
    enabled: clubIds.length > 0,
    queryFn: async (): Promise<Record<string, ClubTeamCountRow[]>> => {
      const entries = await Promise.all(
        clubIds.map(async (id) => {
          const { data, error } = await supabase.rpc("get_club_team_member_counts", {
            _club_id: id,
          });
          if (error) throw error;
          return [id, (data ?? []) as ClubTeamCountRow[]] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });

  if (clubs.length === 0) return null;

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        <Users className="h-5 w-5 text-muted-foreground" /> Andre hold i mine klubber
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Oversigt over alle hold i dine klubber. Du kan kun se holdnavn og antal medlemmer.
      </p>
      <div className="mt-4 space-y-4">
        {clubs.map((club) => {
          const teams = teamsByClub[club.clubId] ?? [];
          return (
            <div key={club.clubId} className="rounded-xl border p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {club.logoUrl ? (
                  <img
                    src={club.logoUrl}
                    alt=""
                    className="h-5 w-5 shrink-0 rounded object-cover"
                  />
                ) : (
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                {club.clubName}
              </p>
              <ul className="mt-2 divide-y">
                {teams.length === 0 ? (
                  <li className="py-2 text-xs text-muted-foreground">Ingen hold fundet.</li>
                ) : (
                  teams.map((team) => {
                    const isMine = memberships.some((m) => m.teamId === team.team_id);
                    return (
                      <li key={team.team_id} className="flex items-center gap-2 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm">{team.team_name}</span>
                        {isMine && <Badge variant="pitch">Mit hold</Badge>}
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {team.member_count}{" "}
                          {team.member_count === 1 ? "medlem" : "medlemmer"}
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function IndstillingerPage() {
  const { current, memberships, isAdmin, refreshMemberships, setCurrentTeamId } = useTeam();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirm();
  const teamId = current?.teamId;

  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoCropFile, setLogoCropFile] = useState<File | null>(null);
  const [logoCropClubId, setLogoCropClubId] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(current?.clubId ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [mpOpen, setMpOpen] = useState(false);
  const [mpNumber, setMpNumber] = useState("");
  const [mpBoxCode, setMpBoxCode] = useState("");
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [clubOpen, setClubOpen] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [newClubTeam, setNewClubTeam] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const { data: payments = [] } = useQuery({
    queryKey: ["team", teamId, "all-payments-sums"],
    enabled: !!teamId && isAdmin,
    queryFn: async (): Promise<PaymentSum[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("team_id", teamId!);
      if (error) throw error;
      return (data ?? []) as PaymentSum[];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["team", teamId, "withdrawals"],
    enabled: !!teamId && isAdmin,
    queryFn: async (): Promise<WithdrawalSum[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("amount")
        .eq("team_id", teamId!);
      if (error) throw error;
      return (data ?? []) as WithdrawalSum[];
    },
  });

  const clubs = useMemo(() => {
    const map = new Map<string, ClubGroup>();
    for (const m of memberships) {
      const entry =
        map.get(m.clubId) ??
        ({ clubId: m.clubId, clubName: m.clubName, logoUrl: m.clubLogoUrl, teams: [] } as ClubGroup);
      entry.teams.push(m);
      map.set(m.clubId, entry);
    }
    return [...map.values()];
  }, [memberships]);

  useEffect(() => {
    if (!selectedClubId || !clubs.some((c) => c.clubId === selectedClubId)) {
      setSelectedClubId(current?.clubId ?? clubs[0]?.clubId ?? null);
    }
  }, [clubs, current?.clubId, selectedClubId]);

  const selectedClub = clubs.find((c) => c.clubId === selectedClubId) ?? null;
  const isClubAdmin = !!selectedClub?.teams.some((t) => t.role === "admin");
  const activeTeamInClub =
    selectedClub && current && current.clubId === selectedClub.clubId ? current : null;

  if (!current || !teamId) return null;

  const carryover = current.balanceCarryover ?? 0;
  const paidTotal = sumAmounts(payments.filter((p) => p.status === "approved"));
  const cashBalance = carryover + paidTotal - sumAmounts(withdrawals);

  const handleClubLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedClub) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vælg en billedfil");
      return;
    }
    setLogoCropClubId(selectedClub.clubId);
    setLogoCropFile(file);
  };

  const handleClubLogoCropped = async (dataUrl: string) => {
    const clubId = logoCropClubId;
    if (!clubId) return;
    setLogoBusy(true);
    try {
      const { error } = await supabase.rpc("set_club_logo", {
        _club_id: clubId,
        _logo_url: dataUrl,
      });
      if (error) throw error;
      toast.success("Klubbens billede er opdateret");
      await refreshMemberships();
      setLogoCropFile(null);
      setLogoCropClubId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke uploade billedet");
    } finally {
      setLogoBusy(false);
    }
  };

  const handleRemoveClubLogo = async () => {
    if (!selectedClub) return;
    const ok = await confirm({
      title: "Fjern klubbens billede?",
      description: "Klubben vises igen uden billede.",
      confirmLabel: "Fjern billede",
    });
    if (!ok) return;
    setLogoBusy(true);
    const { error } = await supabase.rpc("set_club_logo", {
      _club_id: selectedClub.clubId,
      _logo_url: null as unknown as string,
    });
    setLogoBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Klubbens billede er fjernet");
    await refreshMemberships();
  };

  const handleCreateClub = async () => {
    if (!newClubName.trim() || !newClubTeam.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("create_club", {
      _name: newClubName.trim(),
      _team_name: newClubTeam.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { team_id?: string; invite_code?: string } | null;
    toast.success(
      result?.invite_code
        ? `Klubben er oprettet — klubkode: ${result.invite_code}`
        : "Klubben er oprettet",
    );
    setClubOpen(false);
    setNewClubName("");
    setNewClubTeam("");
    await refreshMemberships();
    if (result?.team_id) setCurrentTeamId(result.team_id);
  };

  const handleJoinClub = async () => {
    if (joinCode.trim().length < 6) return;
    setBusy(true);
    const { error } = await supabase.rpc("join_club_by_code", { _code: joinCode.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Anmodning sendt — afventer godkendelse af en administrator i klubben");
    setJoinCode("");
    setJoinOpen(false);
    await refreshMemberships();
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !selectedClub) return;
    setBusy(true);
    const { error } = await supabase.rpc("create_team", {
      _club_id: selectedClub.clubId,
      _name: teamName.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Holdet "${teamName.trim()}" er oprettet`);
    setTeamName("");
    setCreateOpen(false);
    await refreshMemberships();
  };

  const handleDeleteTeam = async (target: Membership) => {
    const ok = await confirm({
      title: `Slet ${target.teamName}?`,
      description:
        "Dette sletter holdet permanent inkl. alle dets bøder, bødesatser, indbetalinger, udbetalinger, kampe, afstemninger og medlemskaber. Handlingen kan ikke fortrydes.",
      confirmLabel: "Slet holdet",
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await supabase.rpc("delete_team", { _team_id: target.teamId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Holdet "${target.teamName}" er slettet`);
    await queryClient.invalidateQueries();
    await refreshMemberships();
  };

  const handleSaveMobilepay = async () => {
    const trimmed = mpNumber.trim();
    if (trimmed && !/^\d{8}$/.test(trimmed)) {
      toast.error("Nummeret skal være præcis 8 cifre");
      return;
    }
    const trimmedBox = mpBoxCode.trim();
    setBusy(true);
    const { error } = await supabase
      .from("teams")
      .update({ mobilepay_number: trimmed || null, mobilepay_box_code: trimmedBox || null })
      .eq("id", teamId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(trimmed || trimmedBox ? "MobilePay-oplysninger gemt" : "MobilePay-oplysninger fjernet");
    setMpOpen(false);
    await refreshMemberships();
  };

  /** Kun klubbens administratorer kan slette hele klubben og alle dens data. */
  const handleDeleteClub = async () => {
    if (!selectedClub) return;
    const ok = await confirm({
      title: "Er du sikker på, at du vil slette klubben?",
      description: `Alle data for ${selectedClub.clubName} — hold, medlemskaber, bøder, bødesatser, indbetalinger, kampe og afstemninger — bliver slettet, og handlingen kan ikke fortrydes.`,
      confirmLabel: "Slet klub",
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await supabase.rpc("delete_club", { _club_id: selectedClub.clubId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Klubben "${selectedClub.clubName}" er slettet`);
    setSelectedClubId(null);
    await queryClient.invalidateQueries();
    await refreshMemberships();
    navigate({ to: "/hjem" });
  };

  const handleEndSeason = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("end_season", { _team_id: teamId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sæsonen er afsluttet — kassens saldo er overført til den nye sæson");
    setSeasonOpen(false);
    await queryClient.invalidateQueries();
    await refreshMemberships();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Indstillinger</h1>
        <p className="mt-1 text-muted-foreground">
          Vælg først en klub — derefter kan du vælge og administrere klubbens hold.
        </p>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Building2 className="h-5 w-5 text-muted-foreground" /> Dine klubber
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setJoinOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" /> Tilmeld med kode
            </Button>
            <Button variant="pitch" size="sm" onClick={() => setClubOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Start en ny klub
            </Button>
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {clubs.map((club) => {
            const active = club.clubId === selectedClubId;
            return (
              <li key={club.clubId}>
                <button
                  type="button"
                  onClick={() => setSelectedClubId(club.clubId)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    active ? "border-pitch bg-pitch-soft/50" : "bg-background hover:bg-muted/40"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold">
                      {club.clubName}
                      {club.clubId === current.clubId && <Badge variant="pitch">Aktiv</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {club.teams.length} {club.teams.length === 1 ? "hold" : "hold"} ·{" "}
                      {club.teams.some((t) => t.role === "admin")
                        ? "Du er administrator"
                        : "Du er medlem"}
                    </p>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 ${active ? "text-pitch" : "text-muted-foreground"}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <OtherTeamsOverview />

      {selectedClub && (
        <section className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Users className="h-5 w-5 text-muted-foreground" /> Hold i {selectedClub.clubName}
            </h2>
            {isClubAdmin && (
              <Button variant="pitch" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Opret nyt hold
              </Button>
            )}
          </div>
          <ul className="mt-3 divide-y">
            {selectedClub.teams.map((m) => (
              <li key={m.teamId} className="py-3">
                <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold">
                    {m.teamName}
                    {m.teamId === teamId && <Badge variant="pitch">Aktivt</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.role === "admin" ? "Du er administrator" : "Du er medlem"}
                  </p>
                </div>
                {m.teamId !== teamId && (
                  <Button variant="subtle" size="sm" onClick={() => setCurrentTeamId(m.teamId)}>
                    Vælg
                  </Button>
                )}
                {m.role === "admin" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteTeam(m)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Slet
                  </Button>
                )}
                </div>
                {m.role === "admin" && (
                  <TeamInviteCode teamId={m.teamId} teamName={m.teamName} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {selectedClub && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-4">
            {selectedClub.logoUrl ? (
              <img
                src={selectedClub.logoUrl}
                alt={`Klubbillede for ${selectedClub.clubName}`}
                className="h-16 w-16 shrink-0 rounded-xl border object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border bg-secondary">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </span>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Klubbillede · {selectedClub.clubName}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isClubAdmin
                  ? "Vises for klubbens medlemmer i appen."
                  : "Kun klubbens administratorer kan ændre billedet."}
              </p>
            </div>
          </div>
          {isClubAdmin && (
            <div className="flex flex-wrap gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleClubLogoFile}
              />
              <Button
                variant="subtle"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoBusy}
              >
                <Camera className="mr-2 h-4 w-4" />
                {logoBusy ? "Uploader…" : selectedClub.logoUrl ? "Skift billede" : "Upload billede"}
              </Button>
              {selectedClub.logoUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveClubLogo}
                  disabled={logoBusy}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Fjern
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      {selectedClub && isClubAdmin && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-card p-4 shadow-card">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ShieldAlert className="h-4 w-4 text-destructive" /> Slet klub · {selectedClub.clubName}
            </p>
            <p className="mt-1 text-sm font-semibold">Slet klubben permanent</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Alle klubbens hold, medlemskaber, bøder, indbetalinger, kampe og afstemninger slettes.
              Handlingen kan ikke fortrydes.
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleDeleteClub} disabled={busy}>
            <Trash2 className="mr-2 h-4 w-4" /> Slet klub
          </Button>
        </section>
      )}

      {activeTeamInClub && isAdmin && (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                MobilePay-nummer · {activeTeamInClub.teamName}
              </p>
              <p className="flex items-center gap-2 font-mono text-xl font-bold tracking-[0.15em]">
                <Smartphone className="h-5 w-5 text-pitch" />
                {current.mobilepayNumber ?? "Ikke sat op"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {current.mobilepayNumber
                  ? "Medlemmer kan overføre deres bøder til dette nummer"
                  : "Medlemmer kan ikke betale via MobilePay, før nummeret er sat op"}
              </p>
              {current.mobilepayBoxCode && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Box-kode:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {current.mobilepayBoxCode}
                  </span>
                </p>
              )}
            </div>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => {
                setMpNumber(current.mobilepayNumber ?? "");
                setMpBoxCode(current.mobilepayBoxCode ?? "");
                setMpOpen(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {current.mobilepayNumber ? "Rediger nummer" : "Tilføj nummer"}
            </Button>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-card p-4 shadow-card">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sæson · {activeTeamInClub.teamName}
              </p>
              <p className="text-sm font-semibold">Afslut sæsonen og start en ny</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Alle bøder, indbetalinger, kampe og historik nulstilles — kassens saldo overføres.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSeasonOpen(true)}>
              <CalendarOff className="mr-2 h-4 w-4" /> Afslut sæson
            </Button>
          </section>
        </>
      )}

      <Dialog open={clubOpen} onOpenChange={setClubOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Start en ny klub</DialogTitle>
            <DialogDescription>
              Opret en ny klub med sit eget første hold. Du bliver automatisk administrator for
              klubben og får en klubkode, du kan dele. Du kan sagtens være medlem af flere klubber
              samtidig.
            </DialogDescription>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-club-name">Klubnavn</Label>
              <Input
                id="new-club-name"
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                placeholder="Fx Vestby IF"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-club-team">Første hold</Label>
              <Input
                id="new-club-team"
                value={newClubTeam}
                onChange={(e) => setNewClubTeam(e.target.value)}
                placeholder="Fx Herre 1 eller U15"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClubOpen(false)}>
              Annuller
            </Button>
            <Button
              onClick={handleCreateClub}
              disabled={busy || !newClubName.trim() || !newClubTeam.trim()}
            >
              Start klubben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Tilmeld klub med kode</DialogTitle>
            <DialogDescription>
              Indtast den 6-tegns klubkode, du har fået af din klub. En administrator skal godkende
              din anmodning, før du får adgang.
            </DialogDescription>
          </div>
          <div className="space-y-2">
            <Label htmlFor="join-code">Klubkode</Label>
            <Input
              id="join-code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="FX AB12CD"
              maxLength={6}
              className="font-mono uppercase tracking-widest"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>
              Annuller
            </Button>
            <Button onClick={handleJoinClub} disabled={busy || joinCode.trim().length < 6}>
              Tilmeld
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Opret nyt hold</DialogTitle>
            <DialogDescription>
              Opret et nyt hold i {selectedClub?.clubName} — fx hvis klubben har hold i flere
              rækker. Du bliver administrator på det nye hold.
            </DialogDescription>
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-name">Holdnavn</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Fx 2. hold eller Oldboys"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuller
            </Button>
            <Button onClick={handleCreateTeam} disabled={busy || !teamName.trim()}>
              Opret hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mpOpen} onOpenChange={setMpOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>MobilePay-oplysninger</DialogTitle>
            <DialogDescription>
              Det mobilnummer, som medlemmerne overfører deres bøder til via MobilePay. Lad feltet
              stå tomt for at fjerne nummeret.
            </DialogDescription>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mp-number">Mobilnummer (8 cifre)</Label>
            <Input
              id="mp-number"
              inputMode="numeric"
              maxLength={8}
              value={mpNumber}
              onChange={(e) => setMpNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Fx 12345678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mp-box-code">MobilePay Box-kode (valgfri)</Label>
            <Input
              id="mp-box-code"
              value={mpBoxCode}
              onChange={(e) => setMpBoxCode(e.target.value)}
              placeholder="Fx 1234AB"
            />
            <p className="text-xs text-muted-foreground">
              Vises til medlemmerne sammen med nummeret, når de registrerer en indbetaling.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMpOpen(false)}>
              Annuller
            </Button>
            <Button variant="pitch" onClick={handleSaveMobilepay} disabled={busy}>
              Gem nummer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={seasonOpen} onOpenChange={setSeasonOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Afslut sæsonen?</DialogTitle>
            <DialogDescription>
              Dette sletter alle sæsonens bøder, indbetalinger, udbetalinger, påmindelser, kampe og
              afstemninger for {current.teamName}. Kassens saldo ({formatKr(cashBalance)}) overføres
              som startsaldo til den nye sæson. Bødesatserne bevares. Handlingen kan ikke fortrydes.
            </DialogDescription>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeasonOpen(false)}>
              Annuller
            </Button>
            <Button variant="destructive" onClick={handleEndSeason} disabled={busy}>
              <CalendarOff className="mr-2 h-4 w-4" /> Afslut sæsonen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageCropper
        file={logoCropFile}
        onCancel={() => {
          setLogoCropFile(null);
          setLogoCropClubId(null);
        }}
        onCropped={handleClubLogoCropped}
        title="Beskær klubbillede"
      />

      {confirmDialog}
    </div>
  );
}
