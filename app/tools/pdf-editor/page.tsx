import type { Metadata } from 'next';
import PdfEditorClient from './PdfEditorClient';

export const metadata: Metadata = {
  title: 'Free Online PDF & Image Editor | Text Remover & Signature Inserter',
  description: 'Erase unwanted text, stamps, and logos from PDF documents and images or insert signature PNGs. 100% free and private in-browser editing.',
  keywords: ['edit pdf online free', 'pdf text remover', 'insert signature into pdf', 'erase logo from image free'],
  openGraph: {
    title: 'Free Online PDF & Image Editor | Text Remover & Signature Inserter',
    description: 'Erase unwanted text, stamps, and logos from PDF documents and images or insert signature PNGs. 100% free and private in-browser editing.',
    type: 'website',
  },
};

export default function Page() {
  return <PdfEditorClient />;
}
