'use client';
import { useState } from 'react';
import Link from 'next/link';

interface FileItem {
  file: File;
  id: string;
  status: 'pending' | 'compressing' | 'success' | 'error';
  progress: number;
  downloadUrl?: string;
  finalMessage?: string;
}

import { addHistoryItem } from '@/lib/historyStore';

export default function FileCompressorPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  
  // General Freedom Settings
  const [compressMethod, setCompressMethod] = useState('size'); // size, percentage, dimensions
  const [outputFormat, setOutputFormat] = useState('pdf'); // pdf, jpg, png
  const [targetValue, setTargetValue] = useState('200');
  
  // Aspect Ratio Width & Height inputs with Physical Units & DPI
  const [widthVal, setWidthVal] = useState('800');
  const [heightVal, setHeightVal] = useState('600');
  const [dimensionUnit, setDimensionUnit] = useState<'px' | 'cm' | 'mm' | 'in'>('px');
  const [dpi, setDpi] = useState<number>(300);

  const getPixelVal = (valStr: string, u: 'px' | 'cm' | 'mm' | 'in', currentDpi: number) => {
    const val = parseFloat(valStr) || 0;
    if (u === 'in') return Math.round(val * currentDpi);
    if (u === 'cm') return Math.round((val / 2.54) * currentDpi);
    if (u === 'mm') return Math.round((val / 25.4) * currentDpi);
    return Math.round(val);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: FileItem[] = Array.from(e.target.files).map((file) => ({
      file,
      id: Math.random().toString(36).substring(2, 9),
      status: 'pending',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
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

  // Real PDF / Image Compression Engine
  const startCompression = async (id: string) => {
    const item = files.find((f) => f.id === id);
    if (!item) return;

    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'compressing', progress: 40 } : f))
    );

    try {
      if (item.file.type === 'application/pdf') {
        // Real PDF processing via PDF.js + pdf-lib
        if (!(window as any).pdfjsLib) {
          await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
              (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              resolve(null);
            };
            document.body.appendChild(script);
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        const arrayBuffer = await item.file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const { PDFDocument } = await getPdfLib();

        let finalPdfBytes: Uint8Array | null = null;

        if (compressMethod === 'size') {
          const targetBytes = (parseFloat(targetValue) || 200) * 1024;
          let scale = 1.2;
          let quality = 0.85;

          while (true) {
            const newPdfDoc = await PDFDocument.create();

            for (let i = 1; i <= pdfDoc.numPages; i++) {
              const page = await pdfDoc.getPage(i);
              const viewport = page.getViewport({ scale });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              await page.render({ canvasContext: context, viewport }).promise;

              const jpegBlob: Blob | null = await new Promise((res) =>
                canvas.toBlob((b) => res(b), 'image/jpeg', quality)
              );

              if (jpegBlob) {
                const jpegBuffer = await jpegBlob.arrayBuffer();
                const embeddedJpg = await newPdfDoc.embedJpg(jpegBuffer);
                const newPage = newPdfDoc.addPage([embeddedJpg.width, embeddedJpg.height]);
                newPage.drawImage(embeddedJpg, {
                  x: 0,
                  y: 0,
                  width: embeddedJpg.width,
                  height: embeddedJpg.height,
                });
              }
            }

            finalPdfBytes = await newPdfDoc.save();

            if (finalPdfBytes && finalPdfBytes.byteLength <= targetBytes) break;

            if (quality > 0.15) {
              quality -= 0.15;
            } else if (scale > 0.3) {
              scale *= 0.8;
              quality = 0.75;
            } else {
              break;
            }
          }
        } else {
          const quality = compressMethod === 'percentage' ? Math.max(0.1, (100 - parseInt(targetValue || '50')) / 100) : 0.65;
          const newPdfDoc = await PDFDocument.create();

          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 1.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;

            const jpegBlob: Blob | null = await new Promise((res) =>
              canvas.toBlob((b) => res(b), 'image/jpeg', quality)
            );

            if (jpegBlob) {
              const jpegBuffer = await jpegBlob.arrayBuffer();
              const embeddedJpg = await newPdfDoc.embedJpg(jpegBuffer);
              const newPage = newPdfDoc.addPage([embeddedJpg.width, embeddedJpg.height]);
              newPage.drawImage(embeddedJpg, {
                x: 0,
                y: 0,
                width: embeddedJpg.width,
                height: embeddedJpg.height,
              });
            }
          }
          finalPdfBytes = await newPdfDoc.save();
        }

        const finalBlob = new Blob([finalPdfBytes!.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(finalBlob);

        const savings = item.file.size > 0 ? Math.max(0, Math.round(((item.file.size - finalBlob.size) / item.file.size) * 100)) : 0;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'success',
                  progress: 100,
                  downloadUrl: url,
                  finalMessage: `${(finalBlob.size / 1024).toFixed(1)} KB (${savings}% reduced)`,
                }
              : f
          )
        );
      } else {
        // Image Compression via Canvas
        const url = URL.createObjectURL(item.file);
        const img = new Image();
        img.src = url;
        await new Promise((res) => (img.onload = res));

        let curW = compressMethod === 'dimensions' ? getPixelVal(widthVal, dimensionUnit, dpi) || img.width : img.width;
        let curH = compressMethod === 'dimensions' ? getPixelVal(heightVal, dimensionUnit, dpi) || img.height : img.height;

        const mimeType = outputFormat === 'pdf' ? 'image/jpeg' : `image/${outputFormat}`;
        let finalBlob: Blob | null = null;

        if (compressMethod === 'size') {
          const targetBytes = (parseFloat(targetValue) || 100) * 1024;
          let quality = 0.95;

          while (true) {
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(16, curW);
            canvas.height = Math.max(16, curH);
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const b: Blob | null = await new Promise((res) =>
              canvas.toBlob((blob) => res(blob), mimeType, quality)
            );

            if (b) {
              finalBlob = b;
              if (b.size <= targetBytes) break;
            }

            if (quality > 0.15) {
              quality -= 0.15;
            } else {
              curW = Math.round(curW * 0.85);
              curH = Math.round(curH * 0.85);
              quality = 0.85;
              if (curW <= 32 || curH <= 32) break;
            }
          }
        } else {
          const canvas = document.createElement('canvas');
          canvas.width = curW;
          canvas.height = curH;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          finalBlob = await new Promise((res) =>
            canvas.toBlob((b) => res(b), mimeType, 0.7)
          );
        }

        if (finalBlob) {
          const finalUrl = URL.createObjectURL(finalBlob);
          const savings = item.file.size > 0 ? Math.max(0, Math.round(((item.file.size - finalBlob.size) / item.file.size) * 100)) : 0;
          const msg = `${(finalBlob.size / 1024).toFixed(1)} KB (${savings}% reduced)`;
          
          addHistoryItem({
            filename: `compressed_${item.file.name.split('.')[0]}.${outputFormat}`,
            toolName: 'File Compressor',
            downloadUrl: finalUrl,
            fileSizeText: msg,
          });

          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    status: 'success',
                    progress: 100,
                    downloadUrl: finalUrl,
                    finalMessage: msg,
                  }
                : f
            )
          );
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to compress file.');
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'error' } : f))
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link href="/" className="text-blue-600 font-semibold hover:underline text-sm mb-4 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-black">File Compressor & Resizer</h1>
        <p className="text-slate-600 text-sm mt-2">Compress files, adjust exact width/height aspect ratios, and convert formats seamlessly.</p>
      </div>

      {/* Settings & Upload Box */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-slate-100">
          {/* Output Format Settings */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-black">1. Output Format</label>
              <p className="text-xs text-slate-500">Choose your final file format.</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
              {['pdf', 'jpg', 'png'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setOutputFormat(fmt)}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    outputFormat === fmt ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Adjustment Method Settings */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-black">2. Target Configuration</label>
              <p className="text-xs text-slate-500">Select size limit or input custom dimensions.</p>
            </div>
            
            <div className="space-y-3">
              <select
                value={compressMethod}
                onChange={(e) => setCompressMethod(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:border-blue-600 w-full"
              >
                <option value="size">By File Size (KB)</option>
                <option value="percentage">By Percentage (%)</option>
                <option value="dimensions">By Width & Height (Aspect Ratio)</option>
              </select>

              {compressMethod === 'dimensions' ? (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">UNIT</label>
                      <select
                        value={dimensionUnit}
                        onChange={(e) => setDimensionUnit(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 text-black text-xs font-semibold rounded-xl px-3 py-2 w-full focus:outline-none focus:border-blue-600 cursor-pointer"
                      >
                        <option value="px">Pixels (px)</option>
                        <option value="cm">Centimeters (cm)</option>
                        <option value="mm">Millimeters (mm)</option>
                        <option value="in">Inches (in)</option>
                      </select>
                    </div>
                    {dimensionUnit !== 'px' && (
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">DPI (PRINT)</label>
                        <select
                          value={dpi}
                          onChange={(e) => setDpi(Number(e.target.value))}
                          className="bg-slate-50 border border-slate-200 text-black text-xs font-semibold rounded-xl px-3 py-2 w-full focus:outline-none focus:border-blue-600 cursor-pointer"
                        >
                          <option value={72}>72 DPI (Screen)</option>
                          <option value={96}>96 DPI (Web Standard)</option>
                          <option value={150}>150 DPI (Draft Print)</option>
                          <option value={300}>300 DPI (High Quality / Passport)</option>
                          <option value={600}>600 DPI (Ultra Print)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">
                        WIDTH ({dimensionUnit.toUpperCase()})
                      </label>
                      <input
                        type="number"
                        step={dimensionUnit === 'px' ? '1' : '0.1'}
                        value={widthVal}
                        onChange={(e) => setWidthVal(e.target.value)}
                        placeholder="Width"
                        className="bg-slate-50 border border-slate-200 text-black text-xs rounded-xl px-3 py-2 font-semibold w-full focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <span className="text-slate-400 mt-5">×</span>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">
                        HEIGHT ({dimensionUnit.toUpperCase()})
                      </label>
                      <input
                        type="number"
                        step={dimensionUnit === 'px' ? '1' : '0.1'}
                        value={heightVal}
                        onChange={(e) => setHeightVal(e.target.value)}
                        placeholder="Height"
                        className="bg-slate-50 border border-slate-200 text-black text-xs rounded-xl px-3 py-2 font-semibold w-full focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {dimensionUnit !== 'px' && (
                    <p className="text-[10px] text-blue-600 font-semibold">
                      Calculated canvas resolution: {getPixelVal(widthVal, dimensionUnit, dpi)}×{getPixelVal(heightVal, dimensionUnit, dpi)} px @ {dpi} DPI
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={compressMethod === 'percentage' ? "e.g. 50" : "e.g. 200"}
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-2 font-semibold focus:outline-none focus:border-blue-600 flex-grow"
                  />
                  <span className="text-xs font-bold text-slate-500">{compressMethod === 'percentage' ? '%' : 'KB'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-blue-200 rounded-2xl p-10 text-center bg-blue-50/20 hover:bg-blue-50/50 transition-colors">
          <label className="inline-block bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-10 py-3.5 rounded-full cursor-pointer shadow-lg hover:shadow-blue-500/30 transition-all text-sm sm:text-base">
            Upload Files Here
            <input type="file" accept="application/pdf,image/*" multiple onChange={handleFileSelect} className="hidden" />
          </label>
        </div>
      </div>

      {/* File List Queue */}
      {files.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-black text-lg">Processing Queue ({files.length})</h2>
            <button 
              onClick={() => setFiles([])} 
              className="text-xs font-semibold text-red-500 hover:underline"
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {files.map((item) => (
              <div key={item.id} className="relative p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="truncate pr-4">
                    <p className="font-semibold text-black text-sm truncate">{item.file.name}</p>
                    <p className="text-slate-400 text-xs">
                      Original: {(item.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => startCompression(item.id)}
                          className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          Start Compression
                        </button>
                        <button onClick={() => removeFile(item.id)} className="text-slate-400 hover:text-red-600 p-2 transition-colors cursor-pointer">
                          ✕
                        </button>
                      </>
                    )}

                    {item.status === 'compressing' && (
                      <span className="text-blue-600 text-xs font-bold animate-pulse">Re-encoding PDF/Canvas...</span>
                    )}

                    {item.status === 'success' && item.downloadUrl && (
                      <>
                        <a
                          href={item.downloadUrl}
                          download={`compressed-${item.file.name.split('.')[0]}.${outputFormat}`}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          ↓ Download ({item.finalMessage})
                        </a>
                        <button onClick={() => removeFile(item.id)} className="text-slate-400 hover:text-red-600 p-2 transition-colors cursor-pointer">
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}