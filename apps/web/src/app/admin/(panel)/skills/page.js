'use client';
import ResourceManager from '@/components/admin/ResourceManager';

const fields = [
  { name: 'name', label: 'Skill', required: true },
  { name: 'group', label: 'Group (e.g. Frontend)' },
  { name: 'state', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active use' }, { value: 'learning', label: 'Learning' }, { value: 'exploring', label: 'Exploring' }], hint: 'Be honest: visitors see these labels.' },
];
export default function Page() {
  return (
    <ResourceManager title="Skills" sub="Grouped on the About page. “Learning” and “Exploring” are labelled clearly." endpoint="/skills" singular="Skill" listQuery="?limit=200"
      blank={{ name: '', group: 'General', state: 'active' }} fields={fields}
      columns={[{ label: 'Skill', render: (s) => <strong>{s.name}</strong> }, { label: 'Group', render: (s) => s.group }, { label: 'Status', render: (s) => ({ active: 'Active use', learning: 'Learning', exploring: 'Exploring' }[s.state]) }]} />
  );
}
