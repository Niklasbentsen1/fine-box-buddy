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
