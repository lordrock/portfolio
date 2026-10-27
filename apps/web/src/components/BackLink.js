'use client';

import { useRouter } from 'next/navigation';

export default function BackLink({ fallback, children }) {
  const router = useRouter();

  function goBack() {
    const cameFromThisSite = document.referrer
      && new URL(document.referrer).origin === window.location.origin;

    if (cameFromThisSite && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallback);
  }

  return (
    <button type="button" className="back-link" onClick={goBack}>
      <span className="back-link-icon" aria-hidden="true">←</span>
      <span>{children}</span>
    </button>
  );
}
