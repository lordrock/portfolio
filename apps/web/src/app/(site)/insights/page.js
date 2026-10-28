import { permanentRedirect } from 'next/navigation';

export default function LegacyInsights() {
  permanentRedirect('/articles');
}
