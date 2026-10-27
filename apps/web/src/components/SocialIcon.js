export default function SocialIcon({ name }) {
  const common = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

  if (name === 'github') return <svg {...common}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7A5.4 5.4 0 0 0 19.4 4 5 5 0 0 0 19.3.5S18.2.1 15 2a13.4 13.4 0 0 0-7 0C4.8.1 3.7.5 3.7.5A5 5 0 0 0 3.6 4a5.4 5.4 0 0 0-1.4 3.7c0 5.4 3.5 6.6 6.8 7A4.8 4.8 0 0 0 8 18v4" /><path d="M8 19c-3 .9-3-1.5-4-2" /></svg>;
  if (name === 'linkedin') return <svg {...common}><rect x="3" y="9" width="4" height="12" /><path d="M5 3.5v.01M11 21v-7a4 4 0 0 1 8 0v7M11 9v12" /></svg>;
  if (name === 'x') return <svg {...common}><path d="M4 4l16 16M20 4L4 20" /></svg>;
  if (name === 'instagram') return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" stroke="none" /></svg>;
  if (name === 'facebook') return <svg {...common}><path d="M14 8h4V3h-4a6 6 0 0 0-6 6v3H4v5h4v4h5v-4h4l1-5h-5V9a1 1 0 0 1 1-1Z" /></svg>;
  if (name === 'tiktok') return <svg {...common}><path d="M15 4v11a5 5 0 1 1-4-4.9M15 4c.5 3 2.2 4.5 5 5" /></svg>;
  return null;
}
