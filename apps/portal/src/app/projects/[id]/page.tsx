import { Metadata } from 'next';
import ProjectPage from '@/components/project/project-page';

interface PageProps {
  params: {
    id: string;
  };
}

export const metadata: Metadata = {
  title: 'Chi tiết dự án - PropCart Portal',
  description: 'Xem chi tiết dự án bất động sản',
};

export default function ProjectDetailPage({ params }: PageProps) {
  return <ProjectPage projectId={params.id} />;
}
