'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFileContext } from './context/FileContext';

export default function HomeClient() {
  const [dragOver, setDragOver] = useState(false);
  const { setFiles } = useFileContext();
  const router = useRouter();

  const handleFiles = (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length > 0) {
      setFiles(filesArray);
      router.push('/tools/multi-hub');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="pb-20 bg-white">
      {/* Hero Banner Section with Instant Multi-Hub Uploader */}
      <section className="bg-gradient-to-b from-blue-50/60 to-white py-20 px-6 text-center relative overflow-hidden border-b border-slate-100">
        
        {/* Background decorative glow */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl h-full bg-blue-400/5 blur-3xl rounded-full pointer-events-none"></div>

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-black mb-4">
            Manage your files <span className="text-blue-600 inline-block hover:scale-105 transition-transform duration-300">instantly.</span>
          </h1>
          <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Compress PDFs, resize photos, convert formats, and manage documents directly in your browser. Fast, free, and 100% secure.
          </p>

          {/* Animated Instant Upload Box -> Multi-Tools Hub */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-2 border-dashed transition-all duration-300 max-w-2xl mx-auto transform cursor-pointer ${
              dragOver ? 'border-blue-600 bg-blue-50/30 scale-105 shadow-xl ring-4 ring-blue-400/20' : 'border-blue-200 hover:border-blue-400'
            }`}
          >
            <div className="space-y-5">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow-sm border border-blue-100">
                📁
              </div>
              <div>
                <p className="font-extrabold text-xl text-black">Drag & drop your files here to start</p>
                <p className="text-slate-500 text-sm mt-2 font-medium">Supports PDF, JPG, PNG, WEBP, DOCX up to 50MB</p>
              </div>
              <label className="inline-block bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-8 py-3.5 rounded-full cursor-pointer shadow-lg hover:shadow-blue-500/30 transition-all duration-200 text-sm sm:text-base">
                Select File(s) to Open Multi-Tools Hub
                <input type="file" multiple className="hidden" onChange={handleFileSelect} />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Section for All Features */}
      <section className="max-w-7xl mx-auto px-6 mt-16 space-y-16">
        
        {/* PDF Tools Category */}
        <div>
          <h2 className="text-2xl font-black text-black mb-8 flex items-center gap-3">
            <span className="w-8 h-1 bg-blue-600 rounded-full"></span>
            PDF Utilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/tools/pdf-compressor" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 mb-4 inline-block">PDF</span>
              <h3 className="text-lg font-bold text-black mb-2 group-hover:text-blue-600 transition-colors">PDF Size Increase / Decrease</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Adjust document file weights precisely.</p>
            </Link>

            <Link href="/tools/pdf-merge" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 mb-4 inline-block">PDF</span>
              <h3 className="text-lg font-bold text-black mb-2 group-hover:text-blue-600 transition-colors">PDF Merge & Split</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Combine multiple docs or extract pages.</p>
            </Link>

            <Link href="/tools/pdf-convertor" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 mb-4 inline-block">PDF</span>
              <h3 className="text-lg font-bold text-black mb-2 group-hover:text-blue-600 transition-colors">PDF & Image Converter</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Convert pages to images instantly.</p>
            </Link>

            <Link href="/tools/pdf-watermark" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 mb-4 inline-block">PDF</span>
              <h3 className="text-lg font-bold text-black mb-2 group-hover:text-blue-600 transition-colors">PDF Watermark Remover</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Clean up unwanted document markings.</p>
            </Link>

            <Link href="/tools/pdf-image-crop" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 mb-4 inline-block">PDF & Image</span>
              <h3 className="text-lg font-bold text-black mb-2 group-hover:text-blue-600 transition-colors">Crop Images & PDFs</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Instantly crop and download Images and Pdfs</p>
            </Link>
          </div>
        </div>

        {/* Image & Photo Tools Category */}
        <div>
          <h2 className="text-2xl font-black text-black mb-8 flex items-center gap-3">
            <span className="w-8 h-1 bg-blue-600 rounded-full"></span>
            Image & Photo Utilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/tools/image-resizer" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 mb-4 inline-block">Image</span>
              <h3 className="text-lg font-bold text-black mb-2 group-hover:text-blue-600 transition-colors">Image Resizer & Compressor</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Optimize dimensions and file weight.</p>
            </Link>

            <Link href="/tools/image-resizer" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 mb-4 inline-block">Image</span>
              <h3 className="text-lg font-bold text-black mb-2 group-hover:text-blue-600 transition-colors">Signature Resizer & Aspect Ratio</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Fit strict dimension and proportion ratios.</p>
            </Link>

            <Link href="/tools/bg-changer" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 mb-4 inline-block">Image</span>
              <h3 className="text-lg font-bold text-black mb-2 group-hover:text-blue-600 transition-colors">Photo Background Changer</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Swap or clear photo backgrounds easily.</p>
            </Link>
          </div>
        </div>

        {/* Text, Academic & Productivity Category */}
        <div>
          <h2 className="text-2xl font-black text-black mb-8 flex items-center gap-3">
            <span className="w-8 h-1 bg-blue-600 rounded-full"></span>
            Text, Academic & Utilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/tools/word-counter" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 mb-4 inline-block">Text</span>
              <h3 className="text-lg font-bold text-black mb-2 group-hover:text-blue-600 transition-colors">Word Counter & OCR</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Count words or extract text from images instantly.</p>
            </Link>

            <Link href="/tools/cgpa-convertor" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 mb-4 inline-block">Academic</span>
              <h3 className="text-lg font-bold text-black mb-2 group-hover:text-blue-600 transition-colors">CGPA Converter & Vice Versa</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Convert grades to percentages effortlessly.</p>
            </Link>

            <Link href="/tools/ag-qr" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 mb-4 inline-block">Utility</span>
              <h3 className="text-lg font-bold text-black mb-2 group-hover:text-blue-600 transition-colors">Age Calculator & QR Converter</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Calculate exact age and generate QR codes.</p>
            </Link>
          </div>
        </div>

      </section>
    </div>
  );
}
