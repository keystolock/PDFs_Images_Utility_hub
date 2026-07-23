'use client';
import { useState } from 'react';
import Link from 'next/link';

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

export default function PdfMergeSplitPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [mode, setMode] = useState<'merge' | 'split'>('merge');
  
  // Global state for Merge operation
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

  const updateSplitType = (id: string, type: 'individual' | 'range') => {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, splitType: type } : item))
    );
  };

  const updatePages = (id: string, val: string) => {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, pagesToExtract: val } : item))
    );
  };

  // Helper to load pdf-lib dynamically
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

  // Real pdf-lib Split Function (Individual Page by Page or Custom Range)
  const startSplit = async (id: string) => {
    const item = files.find((f) => f.id === id);
    if (!item) return;

    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'processing', progress: 50 } : f))
    );

    try {
      const { PDFDocument } = await getPdfLib();
      const arrayBuffer = await item.file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const numPages = srcDoc.getPageCount();

      if (item.splitType === 'individual') {
        const results: SplitPageResult[] = [];
        for (let i = 0; i < numPages; i++) {
          const newDoc = await PDFDocument.create();
          const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
          newDoc.addPage(copiedPage);

          const pdfBytes = await newDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          results.push({
            pageNumber: i + 1,
            downloadUrl: URL.createObjectURL(blob),
          });
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'success',
                  progress: 100,
                  splitResults: results,
                }
              : f
          )
        );
      } else {
        // Custom Range mode (e.g. "1-3, 5")
        const newDoc = await PDFDocument.create();
        const pageIndicesToCopy: number[] = [];

        if (item.pagesToExtract.trim()) {
          const parts = item.pagesToExtract.split(',');
          parts.forEach((part) => {
            if (part.includes('-')) {
              const [start, end] = part.split('-').map((n) => parseInt(n.trim()));
              if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.max(1, start); i <= Math.min(numPages, end); i++) {
                  pageIndicesToCopy.push(i - 1);
                }
              }
            } else {
              const p = parseInt(part.trim());
              if (!isNaN(p) && p >= 1 && p <= numPages) {
                pageIndicesToCopy.push(p - 1);
              }
            }
          });
        } else {
          for (let i = 0; i < numPages; i++) pageIndicesToCopy.push(i);
        }

        const copiedPages = await newDoc.copyPages(srcDoc, pageIndicesToCopy);
        copiedPages.forEach((p: any) => newDoc.addPage(p));

        const pdfBytes = await newDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'success',
                  progress: 100,
                  downloadUrl: URL.createObjectURL(blob),
                }
              : f
          )
        );
      }
    } catch (err) {
      console.error(err);
      alert('Error splitting PDF file.');
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'error' } : f))
      );
    }
  };

  // Real pdf-lib PDF Merge Function
  const startMerge = async () => {
    if (files.length < 2) return;
    setMergeStatus('processing');

    try {
      const { PDFDocument } = await getPdfLib();
      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        const arrayBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page: any) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setMergeStatus('success');
      setMergeDownloadUrl(url);
    } catch (err) {
      console.error(err);
      alert('Error merging PDFs.');
      setMergeStatus('error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link href="/" className="text-blue-600 font-semibold hover:underline text-sm mb-4 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-black">PDF Merge & Split</h1>
        <p className="text-slate-600 text-sm mt-2">Combine multiple documents or split them page-by-page or by custom range.</p>
      </div>

      {/* Operation Settings & Upload Box */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        
        <div className="pb-6 border-b border-slate-100 space-y-4">
          <div>
            <label className="block text-sm font-bold text-black">1. Choose Operation</label>
            <p className="text-xs text-slate-500">Do you want to combine files or separate them?</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => { setMode('merge'); setMergeStatus('idle'); }}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                mode === 'merge' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Merge PDFs
            </button>
            <button
              onClick={() => setMode('split')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                mode === 'split' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Split PDF
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-blue-200 rounded-2xl p-10 text-center bg-blue-50/20 hover:bg-blue-50/50 transition-colors">
          <label className="inline-block bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-10 py-3.5 rounded-full cursor-pointer shadow-lg hover:shadow-blue-500/30 transition-all text-sm sm:text-base">
            Upload PDF Files
            <input type="file" accept="application/pdf" multiple onChange={handleFileSelect} className="hidden" />
          </label>
          <p className="text-slate-400 text-xs mt-3">
            {mode === 'merge' ? 'Upload 2 or more files to combine them' : 'Upload files to split page by page or by range'}
          </p>
        </div>
      </div>

      {/* File List Queue */}
      {files.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-black text-lg">Processing Queue ({files.length})</h2>
            <button 
              onClick={clearAll} 
              className="text-xs font-semibold text-red-500 hover:underline"
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {files.map((item, index) => (
              <div key={item.id} className="relative p-5 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden space-y-4">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 pr-4 truncate">
                    {mode === 'merge' && (
                      <span className="bg-slate-200 text-slate-500 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-black text-sm truncate">{item.file.name}</p>
                      <p className="text-slate-400 text-xs">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {mode === 'split' && item.status === 'pending' && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                        <div className="flex bg-slate-200 p-1 rounded-xl">
                          <button
                            onClick={() => updateSplitType(item.id, 'individual')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              item.splitType === 'individual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                            }`}
                          >
                            Page by Page
                          </button>
                          <button
                            onClick={() => updateSplitType(item.id, 'range')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              item.splitType === 'range' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                            }`}
                          >
                            Custom Range
                          </button>
                        </div>

                        {item.splitType === 'range' && (
                          <input
                            type="text"
                            placeholder="e.g. 1-3, 5"
                            value={item.pagesToExtract}
                            onChange={(e) => updatePages(item.id, e.target.value)}
                            className="bg-white border border-slate-200 text-black text-xs rounded-xl px-3 py-2 font-semibold w-24 focus:outline-none focus:border-blue-600"
                          />
                        )}

                        <button
                          onClick={() => startSplit(item.id)}
                          className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm"
                        >
                          Split File
                        </button>
                      </div>
                    )}

                    {mode === 'split' && item.status === 'processing' && (
                      <span className="text-blue-600 text-xs font-bold animate-pulse">Processing pdf-lib Split...</span>
                    )}

                    <button
                      onClick={() => removeFile(item.id)}
                      className="text-slate-400 hover:text-red-600 p-2 transition-colors ml-auto"
                      title="Delete file"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Individual Page Downloads */}
                {mode === 'split' && item.status === 'success' && item.splitResults && (
                  <div className="pt-3 border-t border-slate-200/60 space-y-2">
                    <p className="text-xs font-bold text-black">Generated Individual Pages ({item.splitResults.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {item.splitResults.map((page) => (
                        <a
                          key={page.pageNumber}
                          href={page.downloadUrl}
                          download={`page-${page.pageNumber}-${item.file.name}`}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                        >
                          ↓ Page {page.pageNumber}.pdf
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Range Download */}
                {mode === 'split' && item.status === 'success' && item.downloadUrl && (
                  <div className="pt-3 border-t border-slate-200/60">
                    <a
                      href={item.downloadUrl}
                      download={`split-${item.file.name}`}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      ↓ Download Split Range PDF
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Master Action Area for Merge Mode */}
          {mode === 'merge' && files.length >= 2 && (
            <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-4 relative overflow-hidden bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="relative z-10 w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-black text-sm">Ready to Merge {files.length} Files</p>
                  <p className="text-slate-500 text-xs">Files will be combined in order using pdf-lib.</p>
                </div>
                
                {mergeStatus === 'idle' && (
                  <button
                    onClick={startMerge}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-bold px-8 py-3 rounded-full transition-all shadow-lg hover:shadow-blue-500/30"
                  >
                    Merge All Files Now
                  </button>
                )}

                {mergeStatus === 'processing' && (
                  <span className="text-blue-600 text-sm font-bold animate-pulse">Combining PDF ArrayBuffers...</span>
                )}

                {mergeStatus === 'success' && mergeDownloadUrl && (
                  <a
                    href={mergeDownloadUrl}
                    download="Merged-Document.pdf"
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-8 py-3 rounded-full transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    ↓ Download Master PDF
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}