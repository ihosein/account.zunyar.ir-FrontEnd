/** Global upload size limit for all file inputs in the app. */
export const MAX_UPLOAD_BYTES = 512 * 1024;

export class UploadLimitError extends Error {
  readonly code = "UPLOAD_TOO_LARGE" as const;
  constructor(message = "UPLOAD_TOO_LARGE") {
    super(message);
    this.name = "UploadLimitError";
  }
}

export class UploadTypeError extends Error {
  readonly code = "UPLOAD_BAD_TYPE" as const;
  constructor(message = "UPLOAD_BAD_TYPE") {
    super(message);
    this.name = "UploadTypeError";
  }
}

export type PreparedUpload = {
  dataUrl: string;
  blob: Blob;
  mime: string;
  /** Original filename, if any */
  name?: string;
};

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function loadImageFromFile(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("encode failed"));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}

function drawScaled(
  img: HTMLImageElement,
  maxEdge: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/**
 * Aggressively compress an image so the result is ≤ {@link MAX_UPLOAD_BYTES}.
 * Output is JPEG (best compatibility + size).
 */
export async function compressImageFile(
  file: Blob,
  options?: { maxEdge?: number },
): Promise<PreparedUpload> {
  const img = await loadImageFromFile(file);
  let maxEdge = options?.maxEdge ?? 1280;
  const mime = "image/jpeg";

  for (let round = 0; round < 10; round++) {
    const canvas = drawScaled(img, maxEdge);
    for (const quality of [0.72, 0.62, 0.52, 0.42, 0.32, 0.22]) {
      const blob = await canvasToBlob(canvas, mime, quality);
      if (blob.size <= MAX_UPLOAD_BYTES) {
        const dataUrl = await readFileAsDataUrl(blob);
        return { dataUrl, blob, mime, name: file instanceof File ? file.name : undefined };
      }
    }
    maxEdge = Math.round(maxEdge * 0.72);
    if (maxEdge < 320) break;
  }

  throw new UploadLimitError();
}

/**
 * Prepare any upload for the app:
 * - images → heavy compression, then ≤ 512KB
 * - PDF / other → must already be ≤ 512KB (no recompress)
 */
export async function prepareUpload(file: File): Promise<PreparedUpload> {
  if (!file) throw new UploadTypeError();

  if (file.type.startsWith("image/")) {
    return compressImageFile(file);
  }

  // Non-images (e.g. PDF): hard size check only
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadLimitError();
  }

  const dataUrl = await readFileAsDataUrl(file);
  return {
    dataUrl,
    blob: file,
    mime: file.type || "application/octet-stream",
    name: file.name,
  };
}

/** True when error is the shared upload size limit. */
export function isUploadLimitError(err: unknown): boolean {
  return err instanceof UploadLimitError;
}
