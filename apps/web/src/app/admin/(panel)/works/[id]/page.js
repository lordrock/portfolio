'use client';
import { useParams } from 'next/navigation';
import WorkEditor from '@/components/admin/WorkEditor';
export default function Page() {
  const { id } = useParams();
  return <WorkEditor key={id} id={id} />;
}
