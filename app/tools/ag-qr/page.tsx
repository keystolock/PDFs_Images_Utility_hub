import type { Metadata } from 'next';
import QrClient from './QrClient';

export const metadata: Metadata = {
  title: 'Free QR Code Generator Online | High Resolution Download',
  description: 'Create custom high-resolution QR codes for websites, WiFi, and text instantly. 100% free with instant PNG downloading and zero registration.',
  keywords: ['qr code generator free', 'custom qr code maker', 'download png qr code', 'offline qr generator'],
  openGraph: {
    title: 'Free QR Code Generator Online | High Resolution Download',
    description: 'Create custom high-resolution QR codes for websites, WiFi, and text instantly. 100% free with instant PNG downloading and zero registration.',
    type: 'website',
  },
};

export default function Page() {
  return <QrClient />;
}