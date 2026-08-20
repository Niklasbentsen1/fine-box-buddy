import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadImage, cropToDataUrl } from "@/lib/image";

const BOX = 264; // visningsstørrelse på beskæringsfeltet i px

/**
 * Lader brugeren vælge, hvilken del af billedet der skal bruges: træk for at
 * flytte og zoom for at beskære. Resultatet gemmes som et kvadratisk JPEG
 * (data-URL) i samme format som resten af appen bruger til profilbilleder.
 */
export function ImageCropper({
  file,
  onCancel,
  onCropped,
  title = "Beskær billede",
}: {
  file: File | null;
  onCancel: () => void;
  onCropped: (dataUrl: string) => void | Promise<void>;
  title?: string;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImage(null);
    setError(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (!file) return;
    loadImage(file)
      .then((img) => {
        if (!cancelled) setImage(img);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Billedet kunne ikke åbnes");
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const baseScale = image ? BOX / Math.min(image.naturalWidth, image.naturalHeight) : 1;
  const scale = baseScale * zoom;
  const shownW = image ? image.naturalWidth * scale : 0;
  const shownH = image ? image.naturalHeight * scale : 0;

  const clamp = (next: { x: number; y: number }) => ({
    x: Math.min(0, Math.max(BOX - shownW, next.x)),
    y: Math.min(0, Math.max(BOX - shownH, next.y)),
  });

  useEffect(() => {
    if (!image) return;
    setOffset((prev) => ({
      x: Math.min(0, Math.max(BOX - shownW, prev.x)),
      y: Math.min(0, Math.max(BOX - shownH, prev.y)),
    }));
    // centrer ved første indlæsning
  }, [image, shownW, shownH]);

  useEffect(() => {
    if (!image) return;
    setOffset({ x: (BOX - image.naturalWidth * baseScale) / 2, y: (BOX - image.naturalHeight * baseScale) / 2 });
  }, [image, baseScale]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const next = {
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    };
    setOffset(clamp(next));
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const handleSave = async () => {
    if (!image) return;
    setBusy(true);
    try {
      const dataUrl = cropToDataUrl(image, {
        sx: -offset.x / scale,
        sy: -offset.y / scale,
        size: BOX / scale,
      });
      await onCropped(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Billedet kunne ikke gemmes");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <div className="space-y-1.5">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Træk billedet på plads, og zoom ind eller ud, indtil udsnittet passer.
          </DialogDescription>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative touch-none overflow-hidden rounded-full border-2 bg-secondary"
              style={{ width: BOX, height: BOX }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {image && (
                <img
                  src={image.src}
                  alt="Forhåndsvisning"
                  draggable={false}
                  className="pointer-events-none absolute select-none"
                  style={{
                    width: shownW,
                    height: shownH,
                    left: offset.x,
                    top: offset.y,
                    maxWidth: "none",
                  }}
                />
              )}
            </div>

            <div className="flex w-full items-center gap-3">
              <Minus className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--pitch)]"
              />
              <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            <X className="mr-2 h-4 w-4" /> Annuller
          </Button>
          <Button onClick={handleSave} disabled={busy || !image}>
            <Check className="mr-2 h-4 w-4" /> {busy ? "Gemmer…" : "Brug billede"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
