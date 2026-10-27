'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NavLinks({ items, name }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  const active = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <button type="button" className="nav-burger" aria-expanded={open} aria-controls="primary-nav" onClick={() => setOpen((v) => !v)}>
        <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        <span aria-hidden="true" className="burger-lines" data-open={open} />
      </button>
      <nav id="primary-nav" aria-label={`${name} primary`} className="nav" data-open={open}>
        <ul>
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} aria-current={active(i.href) ? 'page' : undefined}>{i.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
