export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
export const DOCUMENT_ACCEPT = [
  'application/pdf',
  '.doc,.docx,.xls,.xlsx,.ppt,.pptx',
  '.odt,.ods,.odp,.rtf,.txt,.md,.csv',
].join(',');
export const MEDIA_ACCEPT = `${IMAGE_ACCEPT},${DOCUMENT_ACCEPT}`;

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
export const isImageFile = (file) => file?.type?.startsWith('image/') || IMAGE_EXTENSIONS.has(file?.name?.split('.').pop()?.toLowerCase());
export const fileBadge = (file) => file?.filename?.split('.').pop()?.toUpperCase().slice(0, 5) || 'FILE';
