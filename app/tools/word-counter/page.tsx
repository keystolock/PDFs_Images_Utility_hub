import type { Metadata } from 'next';
import WordCounterClient from './WordCounterClient';

export const metadata: Metadata = {
  title: 'Word Counter & Image/PDF OCR Scanner Online',
  description: 'Count words, characters, sentences, paragraphs, and reading time in real time. Extract text from images and PDF files using client-side OCR.',
  keywords: ['word counter online', 'character counter free', 'ocr text scanner from image', 'pdf text extractor online'],
  openGraph: {
    title: 'Word Counter & Image/PDF OCR Scanner Online',
    description: 'Count words, characters, sentences, paragraphs, and reading time in real time. Extract text from images and PDF files using client-side OCR.',
    type: 'website',
  },
};

export default function Page() {
  return <WordCounterClient />;
}