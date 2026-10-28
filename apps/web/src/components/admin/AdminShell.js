'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/adminApi';
import { ToastProvider } from './ui';
import ThemeToggle from '@/components/ThemeToggle';

const NAV = [
  { group: 'Overview', items: [{ href: '/admin', label: 'Dashboard' }] },
  { group: 'Content', items: [
    { href: '/admin/works', label: 'Work' },
    { href: '/admin/articles', label: 'Articles' },
    { href: '/admin/services', label: 'Services' },
    { href: '/admin/testimonials', label: 'Testimonials' },
    { href: '/admin/categories', label: 'Categories' },
  ] },
  { group: 'Profile', items: [
    { href: '/admin/profile', label: 'Profile and settings' },
    { href: '/admin/experience', label: 'Experience' },
    { href: '/admin/skills', label: 'Skills' },
  ] },
  { group: 'Inbox and files', items: [
    { href: '/admin/inquiries', label: 'Inquiries' },
    { href: '/admin/media', label: 'Media library' },
  ] },
];

export default function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState(null);
  const [sessionError, setSessionError] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api('/auth/me')
      .then((r) => {
        if (alive) setAdmin(r.admin);
      })
      .catch((error) => {
        if (!alive) return;
        if (error.status === 401) router.replace('/admin/login');
        else setSessionError(error.message || 'Could not verify your session. Please refresh and try again.');
      });
    const onUnauth = () => router.replace('/admin/login');
    window.addEventListener('admin:unauthorized', onUnauth);
    return () => { alive = false; window.removeEventListener('admin:unauthorized', onUnauth); };
  }, [router]);
  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    router.replace('/admin/login');
  }
  if (sessionError) return <div className="a-loading"><p className="a-error" role="alert">{sessionError}</p><button type="button" className="btn btn-quiet" onClick={() => window.location.reload()}>Try again</button></div>;
  if (!admin) return <div className="a-loading" role="status">Checking your session…</div>;

  const active = (href) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  return (
    <ToastProvider>
      <div className="a-shell">
        <header className="a-topbar">
          <button type="button" className="btn btn-quiet btn-sm a-menu" aria-expanded={open} aria-controls="a-nav" onClick={() => setOpen((v) => !v)}>Menu</button>
          <Link href="/admin" className="a-brand"><span className="a-brand-mark" aria-hidden="true">R</span><span>Rock Studio</span></Link>
          <span className="a-spacer" />
          <a className="btn btn-quiet btn-sm a-view-site" href="/" target="_blank" rel="noopener noreferrer">View site <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
          <ThemeToggle />
        </header>
        <nav id="a-nav" className="a-nav" data-open={open} aria-label="Admin">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="a-nav-group">{g.group}</p>
              <ul>{g.items.map((i) => (<li key={i.href}><Link href={i.href} aria-current={active(i.href) ? 'page' : undefined}>{i.label}</Link></li>))}</ul>
            </div>
          ))}
          <div className="a-nav-foot">
            <p>{admin.email}</p>
            <button type="button" className="btn btn-quiet btn-sm" onClick={logout}>Sign out</button>
          </div>
        </nav>
        <main className="a-main" id="main">{children}</main>
      </div>
    </ToastProvider>
  );
}
