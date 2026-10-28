import { permanentRedirect } from 'next/navigation';

export default async function LegacyInsight({ params }) {
  const { slug } = await params;
  permanentRedirect(`/articles/${encodeURIComponent(slug)}`);
}
