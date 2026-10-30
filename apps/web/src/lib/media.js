export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
export const DOCUMENT_ACCEPT = [
  'application/pdf',
  '.doc,.docx,.xls,.xlsx,.ppt,.pptx',
  '.odt,.ods,.odp,.rtf,.txt,.md,.csv',
].join(',');
export const MEDIA_ACCEPT = `${IMAGE_ACCEPT},${DOCUMENT_ACCEPT}`;

// Netlify Functions cap buffered requests at 6 MB. Binary bodies are encoded
// in transit, leaving roughly 4.5 MB; keep multipart uploads below 4 MB.
export const PROXY_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
export const isImageFile = (file) => file?.type?.startsWith('image/') || IMAGE_EXTENSIONS.has(file?.name?.split('.').pop()?.toLowerCase());
export const fileBadge = (file) => file?.filename?.split('.').pop()?.toUpperCase().slice(0, 5) || 'FILE';

const canvasBlob = (canvas, quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));

/** Prepare media for the Netlify -> Render proxy without silently dropping it. */
export async function prepareMediaUpload(file) {
  if (!file || file.size <= PROXY_UPLOAD_MAX_BYTES) return { file, optimized: false };
  if (!isImageFile(file)) {
    throw new Error(`The document is ${(file.size / 1024 / 1024).toFixed(1)} MB. Documents must be under 4 MB when uploaded through Netlify.`);
  }
  if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
    throw new Error(`The animated GIF is ${(file.size / 1024 / 1024).toFixed(1)} MB and cannot be safely optimized here; use one under 4 MB.`);
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const maxSide = 3200;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d', { alpha: true }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let blob;
    for (const quality of [0.88, 0.78, 0.68, 0.58]) {
      blob = await canvasBlob(canvas, quality);
      if (blob?.size <= PROXY_UPLOAD_MAX_BYTES) break;
    }
    if (!blob || blob.size > PROXY_UPLOAD_MAX_BYTES) {
      throw new Error('The image could not be reduced below the 4 MB upload ceiling. Please export a smaller copy.');
    }
    const name = file.name.replace(/\.[^.]+$/, '') || 'image';
    return { file: new File([blob], `${name}.webp`, { type: 'image/webp', lastModified: file.lastModified }), optimized: true };
  } finally {
    bitmap?.close?.();
  }
}
