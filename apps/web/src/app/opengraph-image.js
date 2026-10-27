import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Portfolio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  let name = 'Portfolio';
  let headline = 'I design, build, and grow digital experiences.';
  const logo = await readFile(path.join(process.cwd(), 'public', 'brand-mark.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  try {
    const API_URL = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
    const res = await fetch(`${API_URL}/api/v1/public/site`);
    const j = await res.json();
    name = j.profile?.name || name;
    headline = j.profile?.headline || headline;
  } catch {}
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 80, background: '#f3f4f0', color: '#0f1722' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ width: 108, height: 108, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 28, background: '#fff', boxShadow: '0 18px 50px rgba(15, 23, 34, 0.12)' }}>
            <img src={logoSrc} width={84} height={84} alt="" />
          </div>
          <div style={{ display: 'flex', fontSize: 26, letterSpacing: 2, textTransform: 'uppercase', color: '#bc6638', fontWeight: 700 }}>Portfolio</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980, fontFamily: 'sans-serif', fontWeight: 700 }}>{headline}</div>
          <div style={{ fontSize: 36, marginTop: 36, color: '#566070' }}>{name}</div>
        </div>
      </div>
    ),
    size
  );
}
