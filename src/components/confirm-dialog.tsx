import { useCallback, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/**
 * Imperativ bekræftelsesboks: `if (!(await confirm({ title: "Slet?" }))) return;`
 * Husk at rendere `confirmDialog` i komponentens JSX.
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const confirmDialog = (
    <Dialog open={!!options} onOpenChange={(open) => !open && settle(false)}>
      <DialogContent>
        <div className="space-y-1.5">
          <DialogTitle>{options?.title}</DialogTitle>
          {options?.description && <DialogDescription>{options.description}</DialogDescription>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => settle(false)}>
            {options?.cancelLabel ?? "Annuller"}
          </Button>
          <Button
            variant={options?.destructive === false ? "primary" : "destructive"}
            onClick={() => settle(true)}
          >
            {options?.confirmLabel ?? "Slet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, confirmDialog };
}
