const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;
const MAX_PHOTOS = 4;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = src;
  });
}

/** Resize and re-encode as JPEG to keep review payloads upload-friendly. */
async function compressDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;

  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/** Compress review photos before localStorage / DynamoDB persistence. */
export async function compressReviewPhotos(photos: string[] | undefined): Promise<string[]> {
  if (!photos?.length) return [];

  const slice = photos.filter(Boolean).slice(0, MAX_PHOTOS);
  const out: string[] = [];

  for (const photo of slice) {
    try {
      out.push(await compressDataUrl(photo));
    } catch {
      /* skip unreadable image */
    }
  }

  return out;
}
