import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { FileProvider } from './context/FileContext';

import HeaderHistoryDrawer from './components/HeaderHistoryDrawer';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pdfcraft-utility.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Student Utility Hub & PDF Tools',
    template: '%s | Student Utility Hub & PDF Tools',
  },
  description: 'Free browser-based online tools to merge, compress, convert PDFs, resize images in cm/mm/px, generate QR codes, and calculate CGPA. 100% private with zero server uploads.',
  keywords: [
    'free pdf tools',
    'client side utility hub',
    'compress pdf online',
    'image resizer cm mm',
    'no upload document editor',
    'student utility hub',
  ],
  authors: [{ name: 'Utility Hub Team' }],
  creator: 'Utility Hub',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: 'Student Utility Hub & PDF Tools',
    description: 'Free browser-based online tools to merge, compress, convert PDFs, resize images in cm/mm/px, generate QR codes, and calculate CGPA. 100% private with zero server uploads.',
    siteName: 'Student Utility Hub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Student Utility Hub & PDF Tools',
    description: '100% Free, Private & Client-Side PDF and Image Processing Tools.',
  },
  alternates: {
    canonical: './',
  },
};

const jsonLdSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  'name': 'Student Utility Hub & PDF Tools',
  'url': siteUrl,
  'description': 'Free client-side online tools to merge, compress, convert PDFs, resize images in cm/mm/px, generate QR codes, and calculate CGPA with 100% data privacy.',
  'applicationCategory': 'UtilitiesApplication',
  'operatingSystem': 'All',
  'browserRequirements': 'Requires JavaScript',
  'offers': {
    '@type': 'Offer',
    'price': '0',
    'priceCurrency': 'USD',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      </head>
      <body className="bg-white text-slate-900 min-h-screen flex flex-col font-sans selection:bg-blue-100">
        <FileProvider>
          {/* Animated Navbar without Pricing */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
              <Link href="/" className="text-2xl font-extrabold tracking-tight text-black hover:text-blue-600 transition-colors duration-300">
                Utility<span className="text-blue-600">Hub</span>
              </Link>
              
              {/* Horizontal Utility Navigation */}
              <nav className="hidden md:flex space-x-8 text-[15px] font-semibold items-center">
                
                <Link href="/tools/multi-hub" className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-blue-200 shadow-xs flex items-center gap-2">
                  <span>⚡ Multi-Tools Hub</span>
                </Link>

                {/* Resize Dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-1.5 text-black group-hover:text-blue-600 transition-colors duration-200 cursor-pointer py-2">
                    Resize
                    <svg className="w-4 h-4 transform group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                    <div className="py-2">
                      <Link href="/tools/image-resizer" className="block px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Resize Image</Link>
                      <Link href="/tools/image-resizer" className="block px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Resize Signature</Link>
                    </div>
                  </div>
                </div>

                {/* Crop Dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-1.5 text-black group-hover:text-blue-600 transition-colors duration-200 cursor-pointer py-2">
                    Crop
                    <svg className="w-4 h-4 transform group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                    <div className="py-2">
                      <Link href="/tools/pdf-image-crop" className="block px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Crop Image & PDF</Link>
                    </div>
                  </div>
                </div>

                {/* Compress Dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-1.5 text-black group-hover:text-blue-600 transition-colors duration-200 cursor-pointer py-2">
                    Compress
                    <svg className="w-4 h-4 transform group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                    <div className="py-2">
                      <Link href="/tools/pdf-compressor" className="block px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Compress PDF</Link>
                      <Link href="/tools/image-resizer" className="block px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Compress Image</Link>
                    </div>
                  </div>
                </div>

                {/* Convert Dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-1.5 text-black group-hover:text-blue-600 transition-colors duration-200 cursor-pointer py-2">
                    Convert
                    <svg className="w-4 h-4 transform group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                    <div className="py-2">
                      <Link href="/tools/pdf-convertor" className="block px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Images to PDF</Link>
                      <Link href="/tools/pdf-convertor" className="block px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">PDF to Images</Link>
                      <Link href="/tools/pdf-convertor" className="block px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Word to PDF</Link>
                    </div>
                  </div>
                </div>

                {/* More Dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-1.5 text-black group-hover:text-blue-600 transition-colors duration-200 cursor-pointer py-2">
                    More
                    <svg className="w-4 h-4 transform group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                    <div className="py-2">
                      <Link href="/tools/pdf-merge" className="block px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Merge PDF</Link>
                      <Link href="/tools/pdf-watermark" className="block px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Watermark Remover</Link>
                      <Link href="/tools/bg-changer" className="block px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Background Changer</Link>
                      <Link href="/tools/word-counter" className="block px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Word Counter</Link>
                    </div>
                  </div>
                </div>

                {/* Rightmost Session History Drawer */}
                <HeaderHistoryDrawer />

              </nav>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-grow bg-slate-50/50">
            {children}
          </main>

          {/* Professional Footer */}
          <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 mt-auto">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
              <div>
                <h3 className="text-white font-bold mb-4 text-lg">UtilityHub</h3>
                <p>Fast, secure, and 100% client-side processing. Your files never leave your device.</p>
              </div>
              <div>
                <h3 className="text-white font-bold mb-4">Quick Links</h3>
                <ul className="space-y-2">
                  <li><Link href="/" className="hover:text-blue-400 transition">Home</Link></li>
                  <li><Link href="/tools/multi-hub" className="hover:text-blue-400 transition">Multi-Tools Hub</Link></li>
                  <li><Link href="/tools/pdf-compressor" className="hover:text-blue-400 transition">Compress</Link></li>
                  <li><Link href="/tools/image-resizer" className="hover:text-blue-400 transition">Resize</Link></li>
                  <li><Link href="/tools/pdf-convertor" className="hover:text-blue-400 transition">Convert</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-bold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><Link href="/privacy" className="hover:text-blue-400 transition">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-blue-400 transition">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 text-center mt-10 pt-6 border-t border-slate-800/50">
              <p>© {new Date().getFullYear()} Utility Hub. All rights reserved.</p>
            </div>
          </footer>
        </FileProvider>
      </body>
    </html>
  );
}