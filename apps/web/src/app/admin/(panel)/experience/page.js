'use client';
import ResourceManager from '@/components/admin/ResourceManager';

const fields = [
  { name: 'role', label: 'Role', required: true },
  { name: 'organization', label: 'Organisation', required: true },
  { name: 'location', label: 'Location' },
  { name: 'startLabel', label: 'Start (free text, e.g. “2024”)' },
  { name: 'endLabel', label: 'End (free text)' },
  { name: 'current', label: 'This is my current role', type: 'checkbox' },
  { name: 'summary', label: 'Summary', type: 'textarea', rows: 3 },
  { name: 'highlights', label: 'Highlights', type: 'lines' },
  { name: 'visible', label: 'Show on the website', type: 'checkbox' },
];
export default function Page() {
  return (
    <ResourceManager title="Experience" sub="Shown on About and the online resume, newest first (use the arrows to order)." endpoint="/experience" singular="Experience" reorderable
      blank={{ role: '', organization: '', location: '', startLabel: '', endLabel: '', current: false, summary: '', highlights: [], visible: true }} fields={fields}
      columns={[{ label: 'Role', render: (e) => <strong>{e.role}</strong> }, { label: 'Organisation', render: (e) => e.organization }, { label: 'When', render: (e) => [e.startLabel, e.current ? 'Present' : e.endLabel].filter(Boolean).join(' to ') }]} />
  );
}
