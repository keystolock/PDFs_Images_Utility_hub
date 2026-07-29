'use client';

import { useState } from 'react';
import Link from 'next/link';
import { addHistoryItem } from '@/lib/historyStore';

interface SplitPageResult {
  pageNumber: number;
  downloadUrl: string;
}

interface FileItem {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  splitType: 'individual' | 'range';
  pagesToExtract: string;
  splitResults?: SplitPageResult[];
  downloadUrl?: string;
}

export default function MergeClient() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [mode, setMode] = useState<'merge' | 'split'>('merge');
  
  const [mergeStatus, setMergeStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [mergeDownloadUrl, setMergeDownloadUrl] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: FileItem[] = Array.from(e.target.files).map((file) => ({
      file,
      id: Math.random().toString(36).substring(2, 9),
      status: 'pending',
      progress: 0,
      splitType: 'individual',
      pagesToExtract: '',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    setMergeStatus('idle');
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
    setMergeStatus('idle');
  };

  const clearAll = () => {
    setFiles([]);
    setMergeStatus('idle');
  };

  const getPdfLib = async () => {
    if (!(window as any).PDFLib) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        script.onload = resolve;
        document.body.appendChild(script);
      });
    }
    return (window as any).PDFLib;
  };

  // Real pdf-lib PDF & Image Merge Function
  const startMerge = async () => {
    if (files.length < 2) return;
    setMergeStatus('processing');

    try {
      const { PDFDocument } = await getPdfLib();
      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        if (item.file.type === 'application/pdf') {
          const arrayBuffer = await item.file.arrayBuffer();
          const pdf = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page: any) => mergedPdf.addPage(page));
        } else if (item.file.type.startsWith('image/')) {
          const arrayBuffer = await item.file.arrayBuffer();
          let embeddedImage: any;

          if (item.file.type === 'image/png') {
            embeddedImage = await mergedPdf.embedPng(arrayBuffer);
          } else {
            embeddedImage = await mergedPdf.embedJpg(arrayBuffer);
          }

          const page = mergedPdf.addPage([embeddedImage.width, embeddedImage.height]);
          page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: embeddedImage.width,
            height: embeddedImage.height,
          });
        }
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setMergeStatus('success');
      setMergeDownloadUrl(url);

      addHistoryItem({
        filename: 'Merged-Document.pdf',
        toolName: 'PDF Merge & Split',
        downloadUrl: url,
        fileSizeText: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
      });
    } catch (err) {
      console.error(err);
      alert('Error merging files.');
      setMergeStatus('error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <Link href="/" className="text-blue-600 font-bold hover:underline text-xs block text-left mb-2 w-fit">
          ← Back to Home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-black">PDF Merge & Split</h1>
        <p className="text-slate-500 text-xs mt-0.5">Combine multiple PDF documents and images into a single file or split pages.</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setMode('merge'); setMergeStatus('idle'); }}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'merge' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Merge Files
            </button>
            <button
              onClick={() => setMode('split')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'split' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Split PDF
            </button>
          </div>
        </div>

        {/* Upload Area supporting PDFs and Images */}
        <div className="border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center bg-blue-50/20 hover:bg-blue-50/50 transition-colors">
          <label className="inline-block bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold px-8 py-3 rounded-full cursor-pointer shadow-md text-xs sm:text-sm">
            Upload Files
            <input type="file" accept="application/pdf,image/*" multiple onChange={handleFileSelect} className="hidden" />
          </label>
          <p className="text-slate-400 text-xs mt-2">Supports PDF, PNG, JPG files</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-black text-sm">Processing Queue ({files.length})</h2>
            <button onClick={clearAll} className="text-xs font-bold text-red-500 hover:underline">
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {files.map((item, index) => (
              <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 truncate">
                  <span className="bg-slate-200 text-slate-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                  <p className="font-semibold text-black text-xs truncate">{item.file.name}</p>
                </div>

                <button onClick={() => removeFile(item.id)} className="text-slate-400 hover:text-red-600 text-xs font-bold">
                  ✕
                </button>
              </div>
            ))}
          </div>

          {mode === 'merge' && files.length >= 2 && (
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-600">Ready to combine {files.length} files</span>
              {mergeStatus === 'idle' && (
                <button
                  onClick={startMerge}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-8 py-3 rounded-full shadow-md"
                >
                  Merge All Files Now
                </button>
              )}
              {mergeStatus === 'success' && mergeDownloadUrl && (
                <a
                  href={mergeDownloadUrl}
                  download="Merged-Document.pdf"
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-extrabold px-8 py-3 rounded-full shadow-md cursor-pointer"
                >
                  ↓ Download Merged PDF
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
