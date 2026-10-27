import { env } from '../config/env.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Sends the owner an inquiry notification. Returns true when a provider accepted it. */
export async function notifyOwnerOfInquiry(inquiry) {
  if (!env.emailEnabled || !env.OWNER_EMAIL) {
    console.log(`[email] (not configured) new inquiry from ${inquiry.name} <${inquiry.email}> — stored only.`);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [env.OWNER_EMAIL],
        reply_to: inquiry.email,
        subject: `New portfolio inquiry${inquiry.topic ? ` — ${inquiry.topic}` : ''} from ${inquiry.name}`,
        html: `<p><strong>${esc(inquiry.name)}</strong> &lt;${esc(inquiry.email)}&gt;</p>
               <p>Topic: ${esc(inquiry.topic || '—')}</p>
               <p style="white-space:pre-wrap">${esc(inquiry.message)}</p>
               <p style="color:#888">Manage inquiries in your admin dashboard.</p>`,
      }),
    });
    if (!res.ok) {
      console.error('[email] provider error', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] failed', err.message);
    return false;
  }
}
