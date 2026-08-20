/**
 * Fælles billedhåndtering: skalerer et valgt billede (Fotos eller kamera) til
 * et 256x256 JPEG som data-URL. Bruger createImageBitmap (håndterer store
 * kamerabilleder og EXIF-rotation) med fallback til <img> + data-URL, så
 * iOS-kamerabilleder ikke crasher appen.
 */
function drawToDataUrl(source: CanvasImageSource, width: number, height: number): string {
  const size = 256;
  const scale = Math.max(size / width, size / height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas understøttes ikke");
  ctx.drawImage(source, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Billedet kunne ikke læses"));
    reader.readAsDataURL(file);
  });
}

export async function resizeImage(file: File): Promise<string> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      try {
        return drawToDataUrl(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close?.();
      }
    } catch {
      // falder tilbage til <img>-metoden nedenfor
    }
  }

  const dataUrl = await readAsDataUrl(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Billedformatet understøttes ikke"));
    img.src = dataUrl;
  });
  if (typeof img.decode === "function") {
    try {
      await img.decode();
    } catch {
      /* nogle browsere kaster her selvom billedet er klar */
    }
  }
  return drawToDataUrl(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
}

/**
 * Indlæser en billedfil som et <img>, der er klar til at blive tegnet på et
 * canvas — bruges af beskæringsværktøjet til profilbilleder.
 */
export async function loadImage(file: File): Promise<HTMLImageElement> {
  const dataUrl = await readAsDataUrl(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Billedformatet understøttes ikke"));
    img.src = dataUrl;
  });
  if (typeof img.decode === "function") {
    try {
      await img.decode();
    } catch {
      /* nogle browsere kaster her, selvom billedet er klar */
    }
  }
  return img;
}

/** Beskærer et kvadratisk udsnit af billedet og returnerer et 256px JPEG. */
export function cropToDataUrl(
  image: HTMLImageElement,
  crop: { sx: number; sy: number; size: number },
): string {
  const out = 256;
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas understøttes ikke");
  const natW = image.naturalWidth || image.width;
  const natH = image.naturalHeight || image.height;
  const size = Math.max(1, Math.min(crop.size, natW, natH));
  const sx = Math.max(0, Math.min(crop.sx, natW - size));
  const sy = Math.max(0, Math.min(crop.sy, natH - size));
  ctx.drawImage(image, sx, sy, size, size, 0, 0, out, out);
  return canvas.toDataURL("image/jpeg", 0.85);
}
