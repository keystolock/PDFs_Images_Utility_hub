import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'Paperless - Instant File & Document Tools',
  description: 'Compress PDFs, resize photos, convert formats, and manage documents instantly. 100% free and private in-browser processing.',
  openGraph: {
    title: 'Paperless - Instant File & Document Tools',
    description: 'Compress PDFs, resize photos, convert formats, and manage documents instantly. 100% free and private in-browser processing.',
    type: 'website',
  },
};

export default function HomePage() {
  return <HomeClient />;
}