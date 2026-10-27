'use client';
import ResourceManager from '@/components/admin/ResourceManager';

const fields = [
  { name: 'quote', label: 'Quote (use their exact words)', type: 'textarea', rows: 4, required: true },
  { name: 'authorName', label: 'Name', required: true },
  { name: 'authorRole', label: 'Role' },
  { name: 'company', label: 'Company' },
  { name: 'work', label: 'Related work (optional)', type: 'relation', nullable: true, optionsFrom: { path: '/works', label: 'title' }, placeholder: 'None' },
  { name: 'permissionConfirmed', label: 'I have written permission to publish this testimonial and the attribution', type: 'checkbox' },
  { name: 'approved', label: 'Approved for the public site', type: 'checkbox', hint: 'Only shown when permission is also confirmed.' },
];
export default function Page() {
  return (
    <ResourceManager title="Testimonials" sub="Nothing appears publicly until it is approved and permission is confirmed." endpoint="/testimonials" singular="Testimonial" reorderable
      blank={{ quote: '', authorName: '', authorRole: '', company: '', work: '', permissionConfirmed: false, approved: false }} fields={fields}
      columns={[{ label: 'Quote', render: (t) => <span className="a-clip">“{t.quote}”</span> }, { label: 'From', render: (t) => `${t.authorName}${t.company ? `, ${t.company}` : ''}` }, { label: 'Status', render: (t) => (t.approved && t.permissionConfirmed ? 'Public' : 'Hidden') }]} />
  );
}
