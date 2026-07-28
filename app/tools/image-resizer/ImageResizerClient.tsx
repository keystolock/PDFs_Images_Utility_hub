'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { addHistoryItem } from '@/lib/historyStore';

export default function ImageResizerClient() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resizedUrl, setResizedUrl] = useState<string | null>(null);

  // Pi7 & ImageResizer Settings State
  const [width, setWidth] = useState<string>('1080');
  const [height, setHeight] = useState<string>('2400');
  const [maintainRatio, setMaintainRatio] = useState<boolean>(true);
  const [origRatio, setOrigRatio] = useState<number | null>(null);

  const [enableCompress, setEnableCompress] = useState<boolean>(false);
  const [targetKb, setTargetKb] = useState<string>('100');
  const [outputFormat, setOutputFormat] = useState<'JPEG' | 'JPG' | 'PNG'>('JPEG');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setWidth(img.width.toString());
      setHeight(img.height.toString());
      setOrigRatio(img.width / img.height);
      setPreviewUrl(url);
      setResizedUrl(null);
    };
    img.src = url;
  }, [file]);

  const handleWidthChange = (val: string) => {
    setWidth(val);
    if (maintainRatio && origRatio && !isNaN(parseFloat(val))) {
      setHeight(Math.round(parseFloat(val) / origRatio).toString());
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResizedUrl(null);
  };

  // Perform Image Resizing / Target KB Compression
  const handleResize = async () => {
    if (!file || !previewUrl) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = previewUrl;
      await new Promise((res) => (img.onload = res));

      const targetW = parseInt(width) || img.width;
      const targetH = parseInt(height) || img.height;
      const formatMime = outputFormat === 'PNG' ? 'image/png' : 'image/jpeg';
      const extension = outputFormat.toLowerCase();

      if (enableCompress) {
        const targetBytes = (parseFloat(targetKb) || 100) * 1024;
        let curW = targetW;
        let curH = targetH;
        let bestBlob: Blob | null = null;

        while (!bestBlob) {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(16, curW);
          canvas.height = Math.max(16, curH);
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          let lowQ = 0.05;
          let highQ = 0.98;
          let localBestBlob: Blob | null = null;

          for (let i = 0; i < 10; i++) {
            const midQ = (lowQ + highQ) / 2;
            const blob: Blob | null = await new Promise((res) =>
              canvas.toBlob((b) => res(b), formatMime, midQ)
            );

            if (blob) {
              if (blob.size <= targetBytes) {
                localBestBlob = blob;
                lowQ = midQ + 0.01;
              } else {
                highQ = midQ - 0.01;
              }
            }
          }

          if (localBestBlob) {
            bestBlob = localBestBlob;
          } else {
            curW = Math.round(curW * 0.85);
            curH = Math.round(curH * 0.85);
            if (curW <= 16 || curH <= 16) {
              bestBlob = await new Promise((res) => canvas.toBlob((b) => res(b), formatMime, 0.05));
              break;
            }
          }
        }

        if (bestBlob) {
          const url = URL.createObjectURL(bestBlob);
          setResizedUrl(url);
          triggerDownload(bestBlob, `resized_${file.name.split('.')[0]}.${extension}`);
        }
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

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setResizedUrl(url);
            triggerDownload(blob, `resized_${file.name.split('.')[0]}.${extension}`);
          }
        }, formatMime, 0.92);
      }
    } catch (err) {
      console.error(err);
      alert('Error resizing image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addHistoryItem({
      filename,
      toolName: 'Image Resizer',
      downloadUrl: url,
      fileSizeText: `${(blob.size / 1024).toFixed(1)} KB`,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Title Header */}
      <div className="text-center space-y-1">
        <Link href="/" className="text-blue-600 font-semibold hover:underline text-xs inline-block mb-1">
          ← Back to Home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-black">Resize Image Pixel Online</h1>
        <p className="text-slate-500 text-xs">Fast, free client-side image resizer. 100% private in-browser optimization.</p>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {/* DROP / SELECT CONTAINER (MATCHING SCREENSHOT 2) */}
      {!file && (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border-2 border-dashed border-blue-400 text-center shadow-sm space-y-4">
          <p className="text-slate-600 font-bold text-base">Select Or Drag & Drop Images Here</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 py-3 rounded-xl transition-all shadow-md text-sm cursor-pointer"
          >
            Select Images
          </button>
        </div>
      )}

      {/* LOADED IMAGE & SETTINGS PANEL (MATCHING SCREENSHOT 1 & 3) */}
      {file && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-xl mx-auto">
          
          {/* LOADED THUMBNAIL BOX WITH OVERLAY BUTTONS & PILL TAG (SCREENSHOT 1) */}
          <div className="border-2 border-dashed border-blue-300 p-6 rounded-3xl flex flex-col items-center justify-center space-y-3 bg-slate-50">
            <div className="relative inline-block rounded-2xl overflow-hidden shadow-md border border-slate-200">
              <img src={previewUrl!} alt="Loaded photo" className="max-h-56 w-auto block object-contain" />
              
              {/* Overlay buttons: Crop & Background (Screenshot 1) */}
              <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                <Link href="/tools/pdf-image-crop" className="bg-blue-600/90 hover:bg-blue-700 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                  ✂️ Crop
                </Link>
                <Link href="/tools/bg-changer" className="bg-blue-600/90 hover:bg-blue-700 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                  🎨 Background
                </Link>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-600 max-w-[220px] truncate">{file.name}</p>

            {/* Dimension Pill Badge (Screenshot 1: W-1080 px H-2400 px) */}
            <div className="bg-blue-800 text-white text-xs font-black px-4 py-1.5 rounded-xl shadow-xs flex items-center gap-3">
              <span>W-{width} px</span>
              <span>H-{height} px</span>
            </div>
          </div>

          {/* PI7 SETTINGS FORM CONTROLS (SCREENSHOT 1 & 2) */}
          <div className="space-y-4 text-center">
            
            {/* Maintain Aspect Ratio */}
            <label className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <span>Maintain Aspect Ratio</span>
              <input
                type="checkbox"
                checked={maintainRatio}
                onChange={(e) => setMaintainRatio(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </label>

            {/* Width X Height Input Boxes (Screenshot 1) */}
            <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
              <div className="flex-1 text-left">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Width (PX)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center text-sm font-black text-black focus:outline-none focus:border-blue-600"
                />
              </div>

              <span className="text-slate-400 font-bold text-lg pt-4">X</span>

              <div className="flex-1 text-left">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Height (PX)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center text-sm font-black text-black focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Compress Image To Specific Size Checkbox (Screenshot 1) */}
            <div className="pt-2">
              <label className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableCompress}
                  onChange={(e) => setEnableCompress(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <span>Compress Image To Specific Size (Ex. 100kb)</span>
              </label>

              {enableCompress && (
                <input
                  type="number"
                  value={targetKb}
                  onChange={(e) => setTargetKb(e.target.value)}
                  placeholder="Target KB (e.g. 100)"
                  className="mt-2 w-36 mx-auto bg-slate-50 border border-slate-300 rounded-xl p-2 text-center text-xs font-bold text-black"
                />
              )}
            </div>

            {/* Output Radio Buttons (Screenshot 1: JPEG | JPG | PNG) */}
            <div className="flex items-center justify-center gap-4 pt-2 text-xs font-bold text-slate-700">
              <span>Output:</span>
              {(['JPEG', 'JPG', 'PNG'] as const).map((fmt) => (
                <label key={fmt} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="outputFormat"
                    value={fmt}
                    checked={outputFormat === fmt}
                    onChange={() => setOutputFormat(fmt)}
                    className="text-blue-600 cursor-pointer"
                  />
                  <span>{fmt}</span>
                </label>
              ))}
            </div>

            {/* Resize Image Action Button (Screenshot 1) */}
            <button
              onClick={handleResize}
              disabled={isProcessing}
              className="bg-blue-800 hover:bg-blue-900 active:scale-95 text-white font-black text-sm px-8 py-3.5 rounded-xl transition-all shadow-md w-full max-w-xs cursor-pointer"
            >
              {isProcessing ? 'Resizing Image...' : 'Resize Image'}
            </button>
          </div>

          {/* BOTTOM MOBILE TRAY (+ BUTTON AND THUMBNAIL PILL MATCHING SCREENSHOT 3) */}
          <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-black font-black text-2xl rounded-2xl flex items-center justify-center transition-all shadow-xs cursor-pointer"
              title="Write new / Choose from files"
            >
              +
            </button>

            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200/80 p-1.5 pr-3 rounded-2xl shadow-xs">
              <img src={previewUrl!} alt="Thumbnail" className="w-9 h-9 object-cover rounded-xl border border-slate-300" />
              <span className="text-xs font-bold text-black max-w-[120px] truncate">{file.name}</span>
              <button
                onClick={handleReset}
                className="text-slate-400 hover:text-red-600 text-sm font-bold p-1 cursor-pointer"
                title="Remove photo"
              >
                🗑️
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
