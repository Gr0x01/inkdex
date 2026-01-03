import PipelineDashboard from '@/components/admin/PipelineDashboard';

export const metadata = {
  title: 'Pipeline | Inkdex Admin',
  description: 'Content pipeline management for scraping, processing, and embeddings',
};

export default function PipelinePage() {
  return <PipelineDashboard />;
}
