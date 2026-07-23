'use client';
import { useState } from 'react';
import Link from 'next/link';

interface FileItem {
  file: File;
  id: string;
  previewUrl: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  downloadUrl?: string;
  finalMessage?: string;
}

import { addHistoryItem } from '@/lib/historyStore';

export default function ImageResizerPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  
  // Image Processing Settings
  const [outputFormat, setOutputFormat] = useState('jpg'); // jpg, png, webp
  const [mode, setMode] = useState('dimensions'); // dimensions, compress, signature, aspect_ratio
  
  // Dimension State
  const [width, setWidth] = useState('1920');
  const [height, setHeight] = useState('1080');
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  // Compression State
  const [targetSize, setTargetSize] = useState('100');

  // Signature State 
  const [signaturePreset, setSignaturePreset] = useState('pan_card');

  // Aspect Ratio State
  const [aspectRatioPreset, setAspectRatioPreset] = useState('16:9');

  // Physical Unit & DPI State
  const [unit, setUnit] = useState<'px' | 'cm' | 'mm' | 'in'>('px');
  const [dpi, setDpi] = useState<number>(300);

  // Helper for physical dimensions -> pixels conversion
  const getPixelValue = (valStr: string, u: 'px' | 'cm' | 'mm' | 'in', currentDpi: number) => {
    const val = parseFloat(valStr) || 0;
    if (u === 'in') return Math.round(val * currentDpi);
    if (u === 'cm') return Math.round((val / 2.54) * currentDpi);
    if (u === 'mm') return Math.round((val / 25.4) * currentDpi);
    return Math.round(val); // px
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: FileItem[] = Array.from(e.target.files).map((file) => ({
      file,
      id: Math.random().toString(36).substring(2, 9),
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
  };

  // Real HTML5 Canvas Pipeline for Resizing, Strict Compression, & Format Conversion
  const startProcessing = async (id: string) => {
    const item = files.find((f) => f.id === id);
    if (!item) return;

    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'processing', progress: 40 } : f))
    );

    try {
      const img = new Image();
      img.src = item.previewUrl;
      await new Promise((res) => (img.onload = res));

      let targetW = img.width;
      let targetH = img.height;

      if (mode === 'dimensions') {
        targetW = getPixelValue(width, unit, dpi) || img.width;
        targetH = getPixelValue(height, unit, dpi) || img.height;
      } else if (mode === 'signature') {
        if (signaturePreset === 'pan_card') {
          targetW = 256;
          targetH = 64;
        } else if (signaturePreset === 'passport') {
          targetW = getPixelValue('3.5', 'cm', 300);
          targetH = getPixelValue('4.5', 'cm', 300);
        } else if (signaturePreset === 'ssc_photo') {
          targetW = getPixelValue('3.5', 'cm', 300);
          targetH = getPixelValue('4.5', 'cm', 300);
        } else if (signaturePreset === 'ssc_signature') {
          targetW = getPixelValue('4.0', 'cm', 300);
          targetH = getPixelValue('2.0', 'cm', 300);
        } else if (signaturePreset === 'upsc_photo' || signaturePreset === 'upsc_signature') {
          targetW = 350;
          targetH = 350;
        } else if (signaturePreset === 'ibps_photo') {
          targetW = 200;
          targetH = 230;
        } else if (signaturePreset === 'ibps_signature') {
          targetW = 140;
          targetH = 60;
        } else {
          targetW = 140;
          targetH = 60;
        }
      } else if (mode === 'aspect_ratio') {
        const [rW, rH] = aspectRatioPreset.split(':').map(Number);
        targetW = img.width;
        targetH = Math.round((img.width * rH) / rW);
      }

      const mimeType = `image/${outputFormat === 'jpg' ? 'jpeg' : outputFormat}`;
      let finalBlob: Blob | null = null;

      if (mode === 'compress') {
        // Binary Search Target Size Compression Algorithm
        const targetBytes = (parseFloat(targetSize) || 100) * 1024;
        let curW = targetW;
        let curH = targetH;
        let bestBlob: Blob | null = null;
        let bestW = curW;
        let bestH = curH;

        while (!bestBlob) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = Math.max(16, curW);
          tempCanvas.height = Math.max(16, curH);
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';
            tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
          }

          let lowQ = 0.05;
          let highQ = 0.98;
          let localBestBlob: Blob | null = null;

          for (let i = 0; i < 10; i++) {
            const midQ = (lowQ + highQ) / 2;
            const b: Blob | null = await new Promise((res) =>
              tempCanvas.toBlob((blob) => res(blob), mimeType, midQ)
            );

            if (b) {
              if (b.size <= targetBytes) {
                localBestBlob = b;
                lowQ = midQ + 0.01;
              } else {
                highQ = midQ - 0.01;
              }
            }
          }

          if (localBestBlob) {
            bestBlob = localBestBlob;
            bestW = tempCanvas.width;
            bestH = tempCanvas.height;
          } else {
            curW = Math.round(curW * 0.85);
            curH = Math.round(curH * 0.85);
            if (curW <= 16 || curH <= 16) {
              bestBlob = await new Promise((res) => tempCanvas.toBlob((blob) => res(blob), mimeType, 0.05));
              bestW = tempCanvas.width;
              bestH = tempCanvas.height;
              break;
            }
          }
        }

        finalBlob = bestBlob;
        targetW = bestW;
        targetH = bestH;
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetW, targetH);
        }
        finalBlob = await new Promise((res) => canvas.toBlob((blob) => res(blob), mimeType, 0.92));
      }

      if (finalBlob) {
        const url = URL.createObjectURL(finalBlob);
        const finalMsg = `${targetW}×${targetH}px • ${(finalBlob.size / 1024).toFixed(1)}KB`;
        
        addHistoryItem({
          filename: `resized-${item.file.name.split('.')[0]}.${outputFormat}`,
          toolName: 'Image Resizer',
          downloadUrl: url,
          fileSizeText: finalMsg,
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'success',
                  progress: 100,
                  downloadUrl: url,
                  finalMessage: finalMsg,
                }
              : f
          )
        );
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process image.');
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'error' } : f))
      );
    }
  };

  // Process all pending files in batch
  const processAll = () => {
    files.forEach((file) => {
      if (file.status === 'pending') startProcessing(file.id);
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link href="/" className="text-blue-600 font-semibold hover:underline cursor-pointer text-sm mb-4 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-black">Image & Signature Resizer</h1>
        <p className="text-slate-600 text-sm mt-2">Resize images, adjust signature formats, compress file sizes, and convert formats in batch.</p>
      </div>

      {/* Advanced Settings & Upload Box */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-slate-100">
          
          {/* Format Settings */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-black">1. Output Format</label>
              <p className="text-xs text-slate-500">Choose the final image format.</p>
            </div>
            <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl w-fit">
              {['jpg', 'png', 'webp'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setOutputFormat(fmt)}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                    outputFormat === fmt ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Adjustment Mode Settings */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-black">2. Processing Mode</label>
              <p className="text-xs text-slate-500">How do you want to modify the image?</p>
            </div>
            
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:border-blue-600 w-full cursor-pointer"
            >
              <option value="dimensions">Resize Dimensions (Width/Height)</option>
              <option value="compress">Compress File Size (KB)</option>
              <option value="signature">Signature / Photo Presets</option>
              <option value="aspect_ratio">Standard Aspect Ratio</option>
            </select>

            {/* MODE: DIMENSIONS */}
            {mode === 'dimensions' && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">UNIT</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 text-black text-xs rounded-xl px-3 py-2 font-semibold w-full focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="px">Pixels (px)</option>
                      <option value="cm">Centimeters (cm)</option>
                      <option value="mm">Millimeters (mm)</option>
                      <option value="in">Inches (in)</option>
                    </select>
                  </div>
                  {unit !== 'px' && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">DPI (PRINT)</label>
                      <select
                        value={dpi}
                        onChange={(e) => setDpi(Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 text-black text-xs rounded-xl px-3 py-2 font-semibold w-full focus:outline-none focus:border-blue-600 cursor-pointer"
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
                      WIDTH ({unit.toUpperCase()})
                    </label>
                    <input
                      type="number"
                      step={unit === 'px' ? '1' : '0.1'}
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-black text-xs rounded-xl px-3 py-2 font-semibold w-full focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <span className="text-slate-400 mt-5">×</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      HEIGHT ({unit.toUpperCase()})
                    </label>
                    <input
                      type="number"
                      step={unit === 'px' ? '1' : '0.1'}
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-black text-xs rounded-xl px-3 py-2 font-semibold w-full focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {unit !== 'px' && (
                  <p className="text-[10px] text-blue-600 font-semibold">
                    Calculated canvas resolution: {getPixelValue(width, unit, dpi)}×{getPixelValue(height, unit, dpi)} px @ {dpi} DPI
                  </p>
                )}

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer w-fit">
                  <input type="checkbox" checked={lockAspectRatio} onChange={(e) => setLockAspectRatio(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  Lock Aspect Ratio
                </label>
              </div>
            )}

            {/* MODE: COMPRESS */}
            {mode === 'compress' && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="number"
                  placeholder="e.g. 100"
                  value={targetSize}
                  onChange={(e) => setTargetSize(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-2 font-semibold focus:outline-none focus:border-blue-600 flex-grow"
                />
                <span className="text-xs font-bold text-slate-500">Target KB</span>
              </div>
            )}

            {/* MODE: SIGNATURE */}
            {mode === 'signature' && (
              <div className="pt-2">
                <select
                  value={signaturePreset}
                  onChange={(e) => setSignaturePreset(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:border-blue-600 w-full cursor-pointer"
                >
                  <option value="pan_card">🪪 PAN Card Signature (256x64 px)</option>
                  <option value="passport">📸 Passport Photo (3.5x4.5 cm / 413x531 px)</option>
                  <option value="ssc_photo">📜 SSC Exam Photo (3.5x4.5 cm / 20-50 KB)</option>
                  <option value="ssc_signature">✍️ SSC Exam Signature (4.0x2.0 cm / 10-20 KB)</option>
                  <option value="upsc_photo">🏛️ UPSC Photo (350x350 px / 20-300 KB)</option>
                  <option value="upsc_signature">✒️ UPSC Signature (350x350 px / 20-300 KB)</option>
                  <option value="ibps_photo">🏦 IBPS Bank Photo (4.5x3.5 cm / 200x230 px)</option>
                  <option value="ibps_signature">📝 IBPS Bank Signature (140x60 px / 10-20 KB)</option>
                  <option value="exam">Standard Exam Signature (140x60 px)</option>
                </select>
              </div>
            )}

            {/* MODE: ASPECT RATIO */}
            {mode === 'aspect_ratio' && (
              <div className="pt-2">
                <select
                  value={aspectRatioPreset}
                  onChange={(e) => setAspectRatioPreset(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:border-blue-600 w-full cursor-pointer"
                >
                  <option value="16:9">16:9 (Widescreen / YouTube)</option>
                  <option value="9:16">9:16 (Vertical / Stories / Reels)</option>
                  <option value="4:3">4:3 (Standard Photo)</option>
                  <option value="1:1">1:1 (Square / Instagram)</option>
                  <option value="3:2">3:2 (Classic Photography)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-blue-200 rounded-2xl p-10 text-center bg-blue-50/20 hover:bg-blue-50/50 transition-colors">
          <label className="inline-block bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-10 py-3.5 rounded-full cursor-pointer shadow-lg hover:shadow-blue-500/30 transition-all text-sm sm:text-base">
            Upload Images (Batch Multi-Select)
            <input type="file" accept="image/png, image/jpeg, image/webp" multiple onChange={handleFileSelect} className="hidden" />
          </label>
          <p className="text-slate-400 text-xs mt-3">Supports JPG, PNG, WEBP (Select multiple files)</p>
        </div>
      </div>

      {/* File List Queue */}
      {files.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-black text-lg">Batch Image Queue ({files.length})</h2>
            <div className="flex gap-4">
              <button onClick={processAll} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">Process All Batch</button>
              <button onClick={clearAll} className="text-xs font-semibold text-red-500 hover:underline cursor-pointer">Clear All</button>
            </div>
          </div>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {files.map((item) => (
              <div key={item.id} className="relative p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 truncate pr-4">
                    <img src={item.previewUrl} alt="thumb" className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-black text-sm truncate">{item.file.name}</p>
                      <p className="text-slate-400 text-xs">Original: {(item.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => startProcessing(item.id)}
                          className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          Process
                        </button>
                        <button onClick={() => removeFile(item.id)} className="text-slate-400 hover:text-red-600 p-2 transition-colors cursor-pointer">✕</button>
                      </>
                    )}

                    {item.status === 'processing' && (
                      <span className="text-blue-600 text-xs font-bold animate-pulse">Processing Canvas...</span>
                    )}

                    {item.status === 'success' && item.downloadUrl && (
                      <>
                        <a
                          href={item.downloadUrl}
                          download={`resized-${item.file.name.split('.')[0]}.${outputFormat}`}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          ↓ Download ({item.finalMessage})
                        </a>
                        <button onClick={() => removeFile(item.id)} className="text-slate-400 hover:text-red-600 p-2 transition-colors cursor-pointer">✕</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Big Side-by-Side / Stacked Comparison View for Processed Result */}
                {item.status === 'success' && item.downloadUrl && (
                  <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                      <p className="text-xs font-extrabold text-black uppercase tracking-wider">
                        🖼️ Visual Comparison: Original vs Resized Output ({item.finalMessage})
                      </p>
                      <button
                        onMouseDown={(e) => {
                          const container = e.currentTarget.parentElement?.parentElement;
                          const outputImg = container?.querySelector('.output-img-view') as HTMLImageElement;
                          if (outputImg) outputImg.src = item.previewUrl;
                        }}
                        onMouseUp={(e) => {
                          const container = e.currentTarget.parentElement?.parentElement;
                          const outputImg = container?.querySelector('.output-img-view') as HTMLImageElement;
                          if (outputImg && item.downloadUrl) outputImg.src = item.downloadUrl;
                        }}
                        onMouseLeave={(e) => {
                          const container = e.currentTarget.parentElement?.parentElement;
                          const outputImg = container?.querySelector('.output-img-view') as HTMLImageElement;
                          if (outputImg && item.downloadUrl) outputImg.src = item.downloadUrl;
                        }}
                        onTouchStart={(e) => {
                          const container = e.currentTarget.parentElement?.parentElement;
                          const outputImg = container?.querySelector('.output-img-view') as HTMLImageElement;
                          if (outputImg) outputImg.src = item.previewUrl;
                        }}
                        onTouchEnd={(e) => {
                          const container = e.currentTarget.parentElement?.parentElement;
                          const outputImg = container?.querySelector('.output-img-view') as HTMLImageElement;
                          if (outputImg && item.downloadUrl) outputImg.src = item.downloadUrl;
                        }}
                        className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-xl cursor-pointer select-none touch-none shadow-xs"
                      >
                        👁️ Hold to Flash Original
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      {/* Left: Big Original View */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-center">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700 border-b border-slate-100 pb-1.5">
                          <span>Original Image</span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">
                            {(item.file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <img
                          src={item.previewUrl}
                          alt="Original Full View"
                          className="max-h-[460px] w-auto mx-auto object-contain rounded-xl border border-slate-200 shadow-xs"
                        />
                      </div>

                      {/* Right: Big Resized Output View */}
                      <div className="bg-white p-3 rounded-2xl border border-green-200 shadow-xs space-y-2 text-center">
                        <div className="flex justify-between items-center text-xs font-bold text-green-700 border-b border-green-50 pb-1.5">
                          <span>Resized / Compressed Result</span>
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-extrabold">
                            {item.finalMessage}
                          </span>
                        </div>
                        <img
                          src={item.downloadUrl}
                          alt="Output View"
                          className="output-img-view max-h-[460px] w-auto mx-auto object-contain rounded-xl border border-green-200 shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}