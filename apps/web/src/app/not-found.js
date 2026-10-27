import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="container page notfound">
      <h1>Page not found</h1>
      <p className="page-lede">The page may have moved or never existed.</p>
      <p className="hero-actions"><Link href="/" className="btn btn-primary">Go to the homepage</Link><Link href="/work" className="btn btn-quiet">Browse the work</Link></p>
    </main>
  );
}
