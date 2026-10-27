'use client';
export default function Error({ reset }) {
  return (
    <main className="container page notfound">
      <h1>Something went wrong</h1>
      <p className="page-lede">The page could not be loaded. Try again, and if it keeps happening, come back in a few minutes.</p>
      <button type="button" className="btn btn-primary" onClick={reset}>Try again</button>
    </main>
  );
}
