'use client';
import ResourceManager from '@/components/admin/ResourceManager';

const fields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'slug', label: 'Slug (URL part)', hint: 'Leave empty to generate from the name. Must be unique.' },
  { name: 'kind', label: 'Type', type: 'select', options: [{ value: 'sub', label: 'Subcategory' }, { value: 'pillar', label: 'Top-level area (pillar)' }], hint: 'The four core areas already exist. Add subcategories under them.' },
  { name: 'parent', label: 'Belongs to', type: 'relation', nullable: true, optionsFrom: { path: '/categories', filter: (c) => c.kind === 'pillar' }, showIf: (f) => f.kind === 'sub' },
  { name: 'description', label: 'Short description', type: 'textarea', rows: 2 },
];
export default function Page() {
  return (
    <ResourceManager title="Categories" sub="Four core areas plus your own subcategories. Use the order arrows to change how they appear." endpoint="/categories" singular="Category"
      blank={{ name: '', slug: '', kind: 'sub', parent: '', description: '' }} fields={fields}
      canDelete={(c) => c.kind !== 'pillar'} deleteHint="Subcategories that are used by work cannot be deleted until removed from it."
      columns={[{ label: 'Name', render: (c) => <strong>{c.name}</strong> }, { label: 'Slug', render: (c) => c.slug }, { label: 'Type', render: (c) => (c.kind === 'pillar' ? 'Area' : `Under ${c.parent?.name || '?'}`) }]} />
  );
}
