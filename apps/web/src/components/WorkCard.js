import Link from 'next/link';
import { img, srcSet } from '@/lib/api';
import Pillar from './Pillar';

const STATUS = { live: 'Live', 'in-development': 'In development', completed: 'Completed', archived: 'Archived' };

export default function WorkCard({ work, size = 'md', priority = false, level = 3 }) {
  const H = `h${level}`;
  const cover = work.cover;
  const tech = (work.technologies || []).slice(0, 4);
  return (
    <article className={`work-card work-card-${size}`}>
      <Link href={`/work/${work.slug}`} className="work-card-link">
        <div className="work-card-media">
          {cover?.url ? (
            <img
              src={img(cover.url, 900)}
              srcSet={srcSet(cover.url)}
              sizes={size === 'lg' ? '(min-width: 900px) 62vw, 100vw' : '(min-width: 900px) 30vw, (min-width: 600px) 45vw, 100vw'}
              alt={cover.alt || ''}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              width={cover.width || 1200}
              height={cover.height || 900}
            />
          ) : (
            <div className="work-card-placeholder" aria-hidden="true" />
          )}
          {work.galleryCount > 1 ? <span className="work-card-count">{work.galleryCount} images</span> : null}
        </div>
        <div className="work-card-body">
          <Pillar category={work.primaryCategory} />
          <H>{work.title}</H>
          <p className="work-card-summary">{work.summary}</p>
          {(tech.length || (work.projectStatus && work.projectStatus !== 'none')) ? (
            <p className="work-card-meta">
              {work.projectStatus && work.projectStatus !== 'none' ? <span>{STATUS[work.projectStatus]}</span> : null}
              {tech.length ? <span>{tech.join(', ')}</span> : null}
            </p>
          ) : null}
          <span className="work-card-arrow" aria-hidden="true">↗</span>
        </div>
      </Link>
    </article>
  );
}
