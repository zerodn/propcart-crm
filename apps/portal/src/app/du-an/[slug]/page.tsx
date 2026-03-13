import { Metadata } from 'next';
import dynamic from 'next/dynamic';

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: 'Chi tiết dự án - PropCart Portal',
    description: 'Xem chi tiết dự án bất động sản',
  };
}

const ProjectDetailPage = dynamic(() => import('@/components/project/project-detail'), {
  ssr: false,
});

export default function SlugPage({ params }: PageProps) {
  // Slug format: {name-slug}-{uuid} — extract the last UUID segment
  const slug = params.slug;
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (5 groups, 8-4-4-4-12)
  const uuidMatch = slug.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  const projectId = uuidMatch ? uuidMatch[1] : slug;

  return <ProjectDetailPage projectId={projectId} />;
}


