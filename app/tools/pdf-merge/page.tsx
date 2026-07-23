import type { Metadata } from 'next';
import MergeClient from './MergeClient';

export const metadata: Metadata = {
  title: 'Merge PDF Online Free | Combine PDF Files Client-Side',
  description: 'Merge multiple PDF files into one document or split pages instantly. 100% free with unlimited files and zero server uploads.',
  keywords: ['merge pdf files online', 'combine pdfs free', 'pdf joiner', 'split pdf pages free'],
  openGraph: {
    title: 'Merge PDF Online Free | Combine PDF Files Client-Side',
    description: 'Merge multiple PDF files into one document or split pages instantly. 100% free with unlimited files and zero server uploads.',
    type: 'website',
  },
};

export default function Page() {
  return <MergeClient />;
}