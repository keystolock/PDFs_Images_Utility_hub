import type { Metadata } from 'next';
import ImageResizerClient from './ImageResizerClient';

export const metadata: Metadata = {
  title: 'Image Resizer Online | Resize in cm, mm, inch, px & Target KB',
  description: 'Resize images using exact physical dimensions (cm, mm, inch, pixels) or hit target file sizes (e.g., 20KB, 50KB) for official exam & passport forms.',
  keywords: ['resize image in cm', 'photo resizer mm inch', 'compress image to 20kb 50kb', 'passport photo dimension resizer'],
  openGraph: {
    title: 'Image Resizer Online | Resize in cm, mm, inch, px & Target KB',
    description: 'Resize images using exact physical dimensions (cm, mm, inch, pixels) or hit target file sizes (e.g., 20KB, 50KB) for official exam & passport forms.',
    type: 'website',
  },
};

export default function Page() {
  return <ImageResizerClient />;
}