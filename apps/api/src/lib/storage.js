import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

if (env.cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);

// Magic-byte sniffing so a renamed .exe can't pass as an image.
const SIGNATURES = [
  { mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, ext: 'jpg' },
  { mime: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), ext: 'png' },
  { mime: 'image/gif', test: (b) => b.subarray(0, 4).toString('ascii') === 'GIF8', ext: 'gif' },
  { mime: 'image/webp', test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP', ext: 'webp' },
  { mime: 'application/pdf', test: (b) => b.subarray(0, 5).toString('ascii') === '%PDF-', ext: 'pdf' },
];

const ZIP_DOCUMENTS = new Map([
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['odt', 'application/vnd.oasis.opendocument.text'],
  ['ods', 'application/vnd.oasis.opendocument.spreadsheet'],
  ['odp', 'application/vnd.oasis.opendocument.presentation'],
]);
const OLE_DOCUMENTS = new Map([
  ['doc', 'application/msword'],
  ['xls', 'application/vnd.ms-excel'],
  ['ppt', 'application/vnd.ms-powerpoint'],
]);
const TEXT_DOCUMENTS = new Map([
  ['txt', 'text/plain'],
  ['md', 'text/markdown'],
  ['csv', 'text/csv'],
]);

const extensionOf = (name = '') => path.extname(name).slice(1).toLowerCase();
const isZip = (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && [0x03, 0x05, 0x07].includes(b[2]) && [0x04, 0x06, 0x08].includes(b[3]);
const isOle = (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
const looksLikeText = (b) => b.length > 0 && !b.includes(0) && b.subarray(0, Math.min(b.length, 4096)).every((byte) => byte === 9 || byte === 10 || byte === 13 || byte >= 32);

export function sniff(buffer, originalName = '') {
  const known = SIGNATURES.find((s) => buffer.length > 12 && s.test(buffer));
  if (known) return { ...known, kind: known.mime.startsWith('image/') ? 'image' : 'document' };

  const ext = extensionOf(originalName);
  if (ZIP_DOCUMENTS.has(ext) && isZip(buffer)) return { mime: ZIP_DOCUMENTS.get(ext), ext, kind: 'document' };
  if (OLE_DOCUMENTS.has(ext) && isOle(buffer)) return { mime: OLE_DOCUMENTS.get(ext), ext, kind: 'document' };
  if (ext === 'rtf' && buffer.subarray(0, 5).toString('ascii') === '{\\rtf') return { mime: 'application/rtf', ext, kind: 'document' };
  if (TEXT_DOCUMENTS.has(ext) && looksLikeText(buffer)) return { mime: TEXT_DOCUMENTS.get(ext), ext, kind: 'document' };
  return null;
}

function pngDims(b) {
  return b.length > 24 ? { width: b.readUInt32BE(16), height: b.readUInt32BE(20) } : {};
}

export async function storeFile({ buffer, originalName, kind }) {
  const sig = sniff(buffer, originalName);
  if (!sig) throw Object.assign(new Error('Unsupported or corrupt file. Use JPEG, PNG, WebP, GIF, PDF, Word, Excel, PowerPoint, OpenDocument, TXT, Markdown or CSV.'), { status: 415 });
  const isDocument = sig.kind === 'document';
  if (kind === 'image' && isDocument) throw Object.assign(new Error('Expected an image'), { status: 415 });
  if (kind === 'document' && !isDocument) throw Object.assign(new Error('Expected a document'), { status: 415 });

  const limit = (isDocument ? env.MAX_DOC_MB : env.MAX_IMAGE_MB) * 1024 * 1024;
  if (buffer.length > limit) throw Object.assign(new Error(`File exceeds ${isDocument ? env.MAX_DOC_MB : env.MAX_IMAGE_MB}MB`), { status: 413 });

  const base = path.parse(originalName || 'file').name.replace(/[^\w-]+/g, '-').slice(0, 40) || 'file';

  if (env.cloudinaryEnabled) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: env.CLOUDINARY_FOLDER,
          resource_type: isDocument ? 'raw' : 'image',
          public_id: `${base}-${crypto.randomBytes(4).toString('hex')}${isDocument ? `.${sig.ext}` : ''}`,
          use_filename: false,
          overwrite: false,
        },
        (err, r) => (err ? reject(err) : resolve(r))
      );
      stream.end(buffer);
    });
    return {
      provider: 'cloudinary',
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: isDocument ? 'raw' : 'image',
      width: result.width,
      height: result.height,
      mime: sig.mime,
      size: buffer.length,
    };
  }

  await fs.mkdir(uploadRoot, { recursive: true });
  const name = `${base}-${crypto.randomBytes(5).toString('hex')}.${sig.ext}`;
  await fs.writeFile(path.join(uploadRoot, name), buffer);
  return {
    provider: 'local',
    url: `/uploads/${name}`,
    publicId: name,
    resourceType: isDocument ? 'raw' : 'image',
    ...(sig.mime === 'image/png' ? pngDims(buffer) : {}),
    mime: sig.mime,
    size: buffer.length,
  };
}

export async function removeStored(media) {
  try {
    if (media.provider === 'cloudinary' && env.cloudinaryEnabled) {
      await cloudinary.uploader.destroy(media.publicId, { resource_type: media.resourceType || 'image' });
    } else if (media.provider === 'local' && media.publicId) {
      await fs.unlink(path.join(uploadRoot, path.basename(media.publicId)));
    }
  } catch (err) {
    console.error('[storage] remove failed', err.message);
  }
}
