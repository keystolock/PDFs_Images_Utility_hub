import type { Metadata } from 'next';
import CropClient from './CropClient';

export const metadata: Metadata = {
  title: 'Crop PDF & Images Online Free | Custom Aspect Ratio Tool',
  description: 'Crop specific areas of PDF pages or images with touch-friendly selection boxes. Live side-by-side visual comparison preview.',
  keywords: ['crop pdf online', 'crop image online free', 'pdf section cropper', 'mobile friendly photo cropper'],
  openGraph: {
    title: 'Crop PDF & Images Online Free | Custom Aspect Ratio Tool',
    description: 'Crop specific areas of PDF pages or images with touch-friendly selection boxes. Live side-by-side visual comparison preview.',
    type: 'website',
  },
};

export default function Page() {
  return <CropClient />;
}