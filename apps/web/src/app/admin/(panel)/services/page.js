'use client';
import ResourceManager from '@/components/admin/ResourceManager';

const fields = [
  { name: 'title', label: 'Service name', required: true },
  { name: 'pillar', label: 'Area', type: 'relation', optionsFrom: { path: '/categories', filter: (c) => c.kind === 'pillar' }, hint: 'Controls the colour and the “related work” link.' },
  { name: 'summary', label: 'One-line summary', type: 'textarea', rows: 2 },
  { name: 'description', label: 'Description', type: 'textarea', rows: 5 },
  { name: 'deliverables', label: 'What the client gets', type: 'lines' },
  { name: 'published', label: 'Show on the website', type: 'checkbox' },
];
export default function Page() {
  return (
    <ResourceManager title="Services" sub="Shown on the Services page. The contact form offers these as topics." endpoint="/services" singular="Service" reorderable
      blank={{ title: '', pillar: '', summary: '', description: '', deliverables: [], published: true }} fields={fields}
      columns={[{ label: 'Service', render: (s) => <strong>{s.title}</strong> }, { label: 'Area', render: (s) => s.pillar?.name }, { label: 'Visible', render: (s) => (s.published ? 'Yes' : 'Hidden') }]} />
  );
}
