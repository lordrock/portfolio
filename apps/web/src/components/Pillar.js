import { pillarKey } from '@/lib/api';

/** Pillar identity: coloured dot + name. Colour is never the only signal because the name is always present. */
export default function Pillar({ category, className = '' }) {
  if (!category?.name) return null;
  return (
    <span className={`pillar-tag ${className}`} data-pillar={pillarKey(category.slug)}>
      <span className="pillar-dot" aria-hidden="true" />
      {category.name}
    </span>
  );
}
