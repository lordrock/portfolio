'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { img, srcSet } from '@/lib/api';

/** Image gallery with accessible lightbox (focus trap, Esc, arrow keys). layout="masonry" | "grid" */
export default function Gallery({ images = [], layout = 'masonry', label = 'Gallery' }) {
  const [index, setIndex] = useState(null);
  const opener = useRef(null);
  const open = index !== null;
  const count = images.length;

  const go = useCallback((d) => setIndex((i) => (i === null ? i : (i + d + count) % count)), [count]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  if (!count) return null;
  const current = open ? images[index] : null;

  return (
    <>
      <ul className={`gallery gallery-${layout}`} aria-label={label}>
        {images.map((im, i) => (
          <li key={`${im.url}-${i}`}>
            <button type="button" className="gallery-item" onClick={(e) => { opener.current = e.currentTarget; setIndex(i); }} aria-label={`Open image ${i + 1} of ${count}${im.alt ? `: ${im.alt}` : ''}`}>
              <img src={img(im.url, 800)} srcSet={srcSet(im.url, [400, 800, 1200])} sizes="(min-width: 900px) 30vw, 50vw" alt={im.alt || ''} loading="lazy" decoding="async" />
            </button>
          </li>
        ))}
      </ul>

      <Dialog.Root open={open} onOpenChange={(o) => !o && setIndex(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="lightbox-overlay" />
          <Dialog.Content className="lightbox" aria-describedby={undefined} onCloseAutoFocus={(e) => { e.preventDefault(); opener.current?.focus(); }}>
            <Dialog.Title className="sr-only">{label}, image {index + 1} of {count}</Dialog.Title>
            {current ? (
              <figure>
                <img src={img(current.url, 1800)} alt={current.alt || ''} />
                {current.caption ? <figcaption>{current.caption}</figcaption> : null}
              </figure>
            ) : null}
            <p className="lightbox-count" aria-live="polite">{index + 1} / {count}</p>
            {count > 1 ? (
              <>
                <button type="button" className="lightbox-nav lightbox-prev" onClick={() => go(-1)} aria-label="Previous image">‹</button>
                <button type="button" className="lightbox-nav lightbox-next" onClick={() => go(1)} aria-label="Next image">›</button>
              </>
            ) : null}
            <Dialog.Close className="lightbox-close" aria-label="Close">×</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
