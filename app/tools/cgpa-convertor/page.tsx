import type { Metadata } from 'next';
import CgpaClient from './CgpaClient';

export const metadata: Metadata = {
  title: 'CGPA to Percentage Converter Online | College & University Calculator',
  description: 'Convert CGPA and SGPA to exact percentage and total marks instantly. Designed for university and college student requirements.',
  keywords: ['cgpa to percentage', 'convert cgpa to marks', 'sgpa to percentage calculator', 'university grade converter'],
  openGraph: {
    title: 'CGPA to Percentage Converter Online | College & University Calculator',
    description: 'Convert CGPA and SGPA to exact percentage and total marks instantly. Designed for university and college student requirements.',
    type: 'website',
  },
};

export default function Page() {
  return <CgpaClient />;
}