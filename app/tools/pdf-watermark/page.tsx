import type { Metadata } from 'next';
import WatermarkClient from './WatermarkClient';

export const metadata: Metadata = {
  title: 'Remove Watermark from PDF Online Free | Clean Document Stamp',
  description: 'Remove unwanted text watermarks, stamps, and logos from PDF documents and images client-side. Fast, private, and 100% free.',
  keywords: ['remove watermark from pdf free', 'pdf watermark remover online', 'clean stamp from pdf', 'erase logo from document'],
  openGraph: {
    title: 'Remove Watermark from PDF Online Free | Clean Document Stamp',
    description: 'Remove unwanted text watermarks, stamps, and logos from PDF documents and images client-side. Fast, private, and 100% free.',
    type: 'website',
  },
};

export default function Page() {
  return <WatermarkClient />;
}