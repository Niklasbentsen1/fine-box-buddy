import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  Coins,
  Copy,
  History,
  Home,
  LogOut,
  Plus,
  Ticket,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/lib/team";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NAV_ITEMS = [
  { to: "/hjem", label: "Hjem", icon: Home },
  { to: "/boeder", label: "Bøder", icon: Ticket },
  { to: "/hold", label: "Hold", icon: Users },
  { to: "/historik", label: "Historik", icon: History },
  { to: "/kampe", label: "Kampe", icon: Trophy },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { memberships, current, profile, user, setCurrentTeamId, refreshMemberships } = useTeam();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [clubCode, setClubCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const handleCreateTeam = async () => {
    if (!current || !teamName.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("create_team", {
      _club_id: current.clubId,
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

  const handleJoinClub = async () => {
    if (!clubCode.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("join_club_by_code", { _code: clubCode.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Du er nu medlem af klubben");
    setClubCode("");
    setJoinOpen(false);
    await refreshMemberships();
  };

  const copyInviteCode = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      toast.error("Kunne ikke kopiere koden");
    }
  };

  const displayName = profile?.displayName || user.email || "Spiller";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Link to="/hjem" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Coins className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-semibold tracking-wide">Bødekassen</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={item.to === "/hjem" ? { exact: true } : undefined}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {current && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left transition-colors hover:bg-secondary">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-pitch text-[11px] font-bold text-pitch-foreground">
                      {initials(current.teamName)}
                    </span>
                    <span className="max-w-28 truncate text-sm font-semibold sm:max-w-40">
                      {current.teamName}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    {current.clubName} · dine hold
                  </DropdownMenuLabel>
                  {memberships.map((m) => (
                    <DropdownMenuItem
                      key={m.teamId}
                      onClick={() => setCurrentTeamId(m.teamId)}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">
                        {m.teamName}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {m.role === "admin" ? "Admin" : "Medlem"}
                        </span>
                      </span>
                      {m.teamId === current.teamId && <Check className="h-4 w-4 text-pitch" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Opret nyt hold
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setJoinOpen(true)}>
                    <Users className="mr-2 h-4 w-4" /> Tilmeld klub med kode
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyInviteCode}>
                    {codeCopied ? (
                      <Check className="mr-2 h-4 w-4 text-pitch" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Klubkode: {current.inviteCode}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initials(displayName) || "?"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="truncate text-sm font-semibold">{displayName}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Log ud
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={item.to === "/hjem" ? { exact: true } : undefined}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-pitch" }}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Opret nyt hold</DialogTitle>
            <DialogDescription>
              Opret et nyt hold i {current?.clubName} — fx hvis klubben har hold i flere rækker. Du
              bliver administrator på det nye hold.
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

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Tilmeld klub med kode</DialogTitle>
            <DialogDescription>
              Indtast den 6-tegns klubkode, du har fået af din klub.
            </DialogDescription>
          </div>
          <div className="space-y-2">
            <Label htmlFor="club-code">Klubkode</Label>
            <Input
              id="club-code"
              value={clubCode}
              onChange={(e) => setClubCode(e.target.value.toUpperCase())}
              placeholder="FX AB12CD"
              maxLength={6}
              className="font-mono uppercase tracking-widest"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>
              Annuller
            </Button>
            <Button onClick={handleJoinClub} disabled={busy || clubCode.trim().length < 6}>
              Tilmeld
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
