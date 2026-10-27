import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function safeEqual(a = '', b = '') {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Called by the API after content changes. Protected by a shared secret.
export async function POST(request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || !safeEqual(request.headers.get('x-revalidate-secret') || '', secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  revalidatePath('/', 'layout');
  revalidatePath('/sitemap.xml');
  return NextResponse.json({ revalidated: true });
}
