import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'Student Utility Hub - 100% Free, Private & Online PDF & Image Tools',
  description: 'Free browser-based online tools to merge, compress, convert PDFs, resize images in cm/mm/px, generate QR codes, and calculate CGPA. 100% private with zero server uploads.',
  openGraph: {
    title: 'Student Utility Hub - 100% Free, Private & Online PDF & Image Tools',
    description: 'Free browser-based online tools to merge, compress, convert PDFs, resize images in cm/mm/px, generate QR codes, and calculate CGPA. 100% private with zero server uploads.',
    type: 'website',
  },
};

export default function HomePage() {
  return <HomeClient />;
}