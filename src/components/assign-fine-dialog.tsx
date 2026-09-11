import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/lib/team";
import { useConfirm } from "@/components/confirm-dialog";
import { formatKr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AssignFineType = { id: string; label: string; amount: number };
export type AssignMember = { userId: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fineType: AssignFineType | null;
  members: AssignMember[];
  teamId: string;
  teamName: string;
  userId: string;
  onAssigned: () => void | Promise<void>;
};

/**
 * Fælles dialog til at tildele en bødesats til én eller flere spillere.
 * Bruges både fra "Bøder"-siden og "Uddel bøde"-knappen på "Hjem",
 * så adfærd (multi-valg, bekræftelse, samlet oprettelse) er identisk.
 */
export function AssignFineDialog({
  open,
  onOpenChange,
  fineType,
  members,
  teamId,
  teamName,
  userId,
  onAssigned,
}: Props) {
  const [assignMembers, setAssignMembers] = useState<string[]>([]);
  const [assignAmount, setAssignAmount] = useState("");
  const [assignCount, setAssignCount] = useState("1");
  const [busy, setBusy] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  // Kun administratorer må uddele bøder — dialogen må aldrig kunne åbnes af et menigt medlem.
  const { isAdmin } = useTeam();

  // Nulstil felterne, hver gang dialogen åbnes med en (ny) bødesats.
  useEffect(() => {
    if (open && fineType) {
      setAssignMembers([]);
      setAssignAmount(String(Number(fineType.amount)));
      setAssignCount("1");
    }
  }, [open, fineType]);

  const toggleAssignMember = (memberId: string) => {
    setAssignMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  };

  const close = () => onOpenChange(false);

  const handleAssign = async () => {
    if (!isAdmin) {
      toast.error("Kun administratorer kan uddele bøder");
      return;
    }
    if (!fineType || assignMembers.length === 0) {
      toast.error("Vælg mindst én spiller");
      return;
    }
    const value = Number(assignAmount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Beløbet skal være større end 0 kr.");
      return;
    }
    const count = Number(assignCount);
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      toast.error("Antal skal være et helt tal mellem 1 og 50");
      return;
    }
    const playerText =
      assignMembers.length === 1 ? "1 spiller" : `${assignMembers.length} spillere`;
    const ok = await confirm({
      title: "Tildel bøde?",
      description: `Du er ved at tildele ${count} × ${fineType.label} (${formatKr(
        value,
      )}) til ${playerText} — i alt ${formatKr(value * count * assignMembers.length)}.`,
      confirmLabel: "Tildel bøde",
      cancelLabel: "Fortryd",
      destructive: false,
    });
    if (!ok) return;
    setBusy(true);
    // Én samlet indsættelse: enten oprettes alle bøder, eller ingen.
    const rows = assignMembers.flatMap((memberId) =>
      Array.from({ length: count }, () => ({
        team_id: teamId,
        user_id: memberId,
        fine_type_id: fineType.id,
        label: fineType.label,
        amount: value,
        created_by: userId,
      })),
    );
    const { error } = await supabase.from("fines").insert(rows);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const perPlayer = count > 1 ? `${count} bøder á ${formatKr(value)}` : "Bøde";
    toast.success(
      assignMembers.length === 1
        ? `${perPlayer} tildelt til ${members.find((m) => m.userId === assignMembers[0])?.name ?? "spilleren"}`
        : `${perPlayer} tildelt til ${playerText}`,
    );
    close();
    await onAssigned();
  };

  return (
    <>
      <Dialog open={open && isAdmin} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>{fineType?.label}</DialogTitle>
            <DialogDescription>
              Bødesats på {fineType ? formatKr(Number(fineType.amount)) : ""} for {teamName}.
            </DialogDescription>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Tildel til spillere</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignMembers(members.map((m) => m.userId))}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Vælg alle
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMembers([])}
                    className="text-xs font-medium text-muted-foreground hover:underline"
                  >
                    Fravælg alle
                  </button>
                </div>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border p-2">
                {members.map((m) => {
                  const checked = assignMembers.includes(m.userId);
                  return (
                    <li key={m.userId}>
                      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleAssignMember(m.userId)}
                          aria-label={`Vælg ${m.name}`}
                        />
                        <span className="text-sm">{m.name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                {assignMembers.length === 0
                  ? "Ingen spillere valgt"
                  : assignMembers.length === 1
                    ? "1 spiller valgt"
                    : `${assignMembers.length} spillere valgt`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="assign-amount">Beløb (kr.)</Label>
                <Input
                  id="assign-amount"
                  inputMode="decimal"
                  value={assignAmount}
                  onChange={(e) => setAssignAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assign-count">Antal</Label>
                <Input
                  id="assign-count"
                  inputMode="numeric"
                  value={assignCount}
                  onChange={(e) => setAssignCount(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              I alt:{" "}
              {formatKr(
                Math.max(0, Number(assignAmount.replace(",", ".")) || 0) *
                  Math.max(0, Number(assignCount) || 0) *
                  assignMembers.length,
              )}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Luk
            </Button>
            <Button
              onClick={handleAssign}
              disabled={busy || !isAdmin || assignMembers.length === 0}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Tildel bøde
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}
