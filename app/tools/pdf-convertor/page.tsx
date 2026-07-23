import type { Metadata } from 'next';
import ConvertorClient from './ConvertorClient';

export const metadata: Metadata = {
  title: 'PDF & Image Converter Online | Convert PDF to JPG, PNG, WEBP & Word',
  description: 'Convert PDF pages into high-resolution JPG/PNG images or turn photos and Word documents into single PDF files for free in your browser.',
  keywords: ['convert pdf to jpg', 'pdf to png converter', 'images to pdf online', 'word to pdf free client side'],
  openGraph: {
    title: 'PDF & Image Converter Online | Convert PDF to JPG, PNG, WEBP & Word',
    description: 'Convert PDF pages into high-resolution JPG/PNG images or turn photos and Word documents into single PDF files for free in your browser.',
    type: 'website',
  },
};

export default function Page() {
  return <ConvertorClient />;
}