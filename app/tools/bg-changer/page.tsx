import type { Metadata } from 'next';
import BgChangerClient from './BgChangerClient';

export const metadata: Metadata = {
  title: 'AI Background Remover & Solid Color Background Fill | Free Online',
  description: 'Isolate photo subjects and swap background colors instantly in your browser. Perfect for passport photos, exam forms, and product cataloging.',
  keywords: ['remove background from image free', 'change photo background color', 'passport background changer', 'white background photo maker'],
  openGraph: {
    title: 'AI Background Remover & Solid Color Background Fill | Free Online',
    description: 'Isolate photo subjects and swap background colors instantly in your browser. Perfect for passport photos, exam forms, and product cataloging.',
    type: 'website',
  },
};

export default function Page() {
  return <BgChangerClient />;
}