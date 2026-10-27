import { NextResponse } from 'next/server';

const API_URL = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
export const dynamic = 'force-dynamic';

// Counts the download (real number, shown in the CMS) then redirects to the stored PDF.
export async function GET(request) {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/resume`, { cache: 'no-store' });
    if (res.ok) {
      const { url } = await res.json();
      return NextResponse.redirect(url.startsWith('/') ? new URL(url, request.url) : url);
    }
  } catch {}
  return NextResponse.redirect(new URL('/resume', request.url));
}
