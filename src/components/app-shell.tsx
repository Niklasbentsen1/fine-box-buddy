import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
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
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/lib/team";
import { formatDateTime, initials } from "@/lib/format";
import { Avatar } from "@/components/avatar";
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

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

function NotificationBell() {
  const { user, current } = useTeam();
  const queryClient = useQueryClient();
  const teamId = current?.teamId;

  const { data: notifications = [] } = useQuery({
    queryKey: ["team", teamId, "notifications", user.id],
    enabled: !!teamId,
    refetchInterval: 30000,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, read_at, created_at")
        .eq("team_id", teamId!)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markRead = async (notification: NotificationRow) => {
    if (notification.read_at) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notification.id);
    await queryClient.invalidateQueries({
      queryKey: ["team", teamId, "notifications", user.id],
    });
  };

  if (!teamId) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border bg-card transition-colors hover:bg-secondary"
          aria-label="Notifikationer"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifikationer</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Ingen notifikationer endnu.
          </p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => markRead(n)}
              className="flex cursor-pointer items-start gap-2.5 py-2.5"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  n.read_at ? "bg-transparent" : "bg-pitch"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm ${
                    n.read_at ? "font-medium" : "font-semibold"
                  }`}
                >
                  {n.title}
                </span>
                <span className="block whitespace-pre-line text-xs text-muted-foreground">
                  {n.body}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground/70">
                  {formatDateTime(n.created_at)}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-full transition-opacity hover:opacity-80"
                  aria-label="Brugermenu"
                >
                  <Avatar name={displayName} url={profile?.avatarUrl} size="sm" />
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
                <DropdownMenuItem onClick={() => navigate({ to: "/profil" })}>
                  <UserRound className="mr-2 h-4 w-4" /> Min profil
                </DropdownMenuItem>
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
