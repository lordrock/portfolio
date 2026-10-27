import { env } from '../config/env.js';

/** Fire-and-forget: asks the Next.js site to purge cached pages. Failure is harmless (pages still refresh within 60s). */
export function pingRevalidate() {
  if (!env.REVALIDATE_URL || !env.REVALIDATE_SECRET) return;
  fetch(env.REVALIDATE_URL, { method: 'POST', headers: { 'x-revalidate-secret': env.REVALIDATE_SECRET }, signal: AbortSignal.timeout(4000) }).catch(() => {});
}
