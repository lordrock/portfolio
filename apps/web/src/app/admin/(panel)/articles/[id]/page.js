'use client';
import { useParams } from 'next/navigation';
import ArticleEditor from '@/components/admin/ArticleEditor';
export default function Page() { const { id } = useParams(); return <ArticleEditor key={id} id={id} />; }
