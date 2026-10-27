import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSite } from '@/lib/api';

export const revalidate = 60;

export default async function SiteLayout({ children }) {
  const site = await getSite();
  const profile = site.profile;
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Header name={profile?.name || 'Portfolio'} hasArticles={site.hasArticles} hasResume />
      <main id="main">
        {site.__offline ? (
          <div className="container"><p className="notice" role="status">Content is temporarily unavailable. Please refresh in a moment.</p></div>
        ) : null}
        {children}
      </main>
      <Footer profile={profile} />
    </>
  );
}
