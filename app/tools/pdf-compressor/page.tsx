import type { Metadata } from 'next';
import CompressorClient from './CompressorClient';

export const metadata: Metadata = {
  title: 'Compress PDF Online Free | Reduce PDF File Size in KB',
  description: 'Reduce PDF file size online to exact target KB limits (e.g. 100KB, 200KB, 500KB) without losing document readability. 100% private in-browser compression.',
  keywords: ['compress pdf free', 'reduce pdf size to 200kb', 'pdf compressor online', 'shrink pdf size without quality loss'],
  openGraph: {
    title: 'Compress PDF Online Free | Reduce PDF File Size in KB',
    description: 'Reduce PDF file size online to exact target KB limits (e.g. 100KB, 200KB, 500KB) without losing document readability. 100% private in-browser compression.',
    type: 'website',
  },
};

export default function Page() {
  return <CompressorClient />;
}