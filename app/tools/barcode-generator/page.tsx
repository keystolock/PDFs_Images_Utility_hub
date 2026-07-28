import type { Metadata } from 'next';
import BarcodeClient from './BarcodeClient';

export const metadata: Metadata = {
  title: 'Free Online Barcode Generator | Code128 PNG Maker',
  description: 'Generate high-resolution Code128 barcodes online free. Customize bar scale, height, and text labels. 100% private in-browser PNG download.',
  keywords: ['barcode generator online', 'free code128 generator', 'create barcode png', 'product barcode maker free'],
  openGraph: {
    title: 'Free Online Barcode Generator | Code128 PNG Maker',
    description: 'Generate high-resolution Code128 barcodes online free. Customize bar scale, height, and text labels. 100% private in-browser PNG download.',
    type: 'website',
  },
};

export default function Page() {
  return <BarcodeClient />;
}
