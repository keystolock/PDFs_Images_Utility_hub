import type { Metadata } from 'next';
import MultiHubClient from './MultiHubClient';

export const metadata: Metadata = {
  title: 'Multi-Tool Workspace - Chain PDF & Image Editing Tools',
  description: 'Process files across multiple tools seamlessly without re-uploading. Crop, convert, resize, and compress documents in a single browser workflow.',
  keywords: ['all in one utility hub', 'multi tool pdf editor', 'batch image process', 'privacy first web tools'],
  openGraph: {
    title: 'Multi-Tool Workspace - Chain PDF & Image Editing Tools',
    description: 'Process files across multiple tools seamlessly without re-uploading. Crop, convert, resize, and compress documents in a single browser workflow.',
    type: 'website',
  },
};

export default function Page() {
  return <MultiHubClient />;
}
