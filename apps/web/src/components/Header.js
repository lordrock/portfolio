import Link from 'next/link';
import NavLinks from './NavLinks';
import ThemeToggle from './ThemeToggle';

export default function Header({ name, hasArticles, hasResume }) {
  const items = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/work', label: 'Work' },
    { href: '/services', label: 'Services' },
    ...(hasArticles ? [{ href: '/insights', label: 'Insights' }] : []),
    { href: '/contact', label: 'Contact' },
  ];
  return (
    <header className="site-header">
      <div className="container header-row">
        <Link href="/" className="brand" aria-label={`${name}, home`}>{name}</Link>
        <NavLinks items={items} name={name} />
        <div className="header-actions">
          {hasResume ? <Link href="/resume" className="btn btn-quiet btn-sm">Resume</Link> : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
