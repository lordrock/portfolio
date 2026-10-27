const configured = [
  ['github', 'GitHub', process.env.NEXT_PUBLIC_SOCIAL_GITHUB_URL],
  ['linkedin', 'LinkedIn', process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL],
  ['x', 'X', process.env.NEXT_PUBLIC_SOCIAL_X_URL],
  ['instagram', 'Instagram', process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL],
  ['facebook', 'Facebook', process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL],
  ['tiktok', 'TikTok', process.env.NEXT_PUBLIC_SOCIAL_TIKTOK_URL],
];

function safePublicUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export const socialLinks = configured
  .map(([platform, label, value]) => ({ platform, label, url: safePublicUrl(value) }))
  .filter((item) => item.url);
