'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { addHistoryItem } from '@/lib/historyStore';

export default function ImageCropClient() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);

  // Crop Ratio / Preset
  const [aspectRatio, setAspectRatio] = useState<'free' | '1:1' | '4:3' | '16:9' | 'passport'>('free');
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, startBox: { x: 10, y: 10, width: 80, height: 80 } });

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setCroppedUrl(null);
    }
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setCroppedUrl(null);
  };

  // Generate Cropped Image Blob
  const handleGenerateCrop = () => {
    if (!previewUrl) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const cropX = (cropBox.x / 100) * img.width;
      const cropY = (cropBox.y / 100) * img.height;
      const cropW = (cropBox.width / 100) * img.width;
      const cropH = (cropBox.height / 100) * img.height;

      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const url = canvas.toDataURL('image/jpeg', 0.95);
        setCroppedUrl(url);
      }
    };
    img.src = previewUrl;
  };

  const handleDownload = () => {
    const target = croppedUrl || previewUrl;
    if (!target || !file) return;

    const a = document.createElement('a');
    a.href = target;
    a.download = `cropped_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addHistoryItem({
      filename: `cropped_${file.name}`,
      toolName: 'Image Crop',
      downloadUrl: target,
      fileSizeText: 'Cropped Image',
    });
  };

  // Touch & Mouse Drag Handlers for Crop Box
  const startDrag = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startBox: { ...cropBox },
    };
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaY = ((clientY - dragStartRef.current.y) / rect.height) * 100;
      const start = dragStartRef.current.startBox;

      const x = Math.max(0, Math.min(100 - start.width, start.x + deltaX));
      const y = Math.max(0, Math.min(100 - start.height, start.y + deltaY));

      setCropBox((prev) => ({ ...prev, x, y }));
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title Header */}
      <div>
        <Link href="/" className="text-blue-600 font-bold hover:underline text-xs inline-block mb-1">
          ← Back to Home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-black">Photo & Image Crop Suite</h1>
        <p className="text-slate-500 text-xs mt-0.5">Interactive aspect ratio cropping with top-only unified ribbon control.</p>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {/* INITIAL FILE DROP CONTAINER */}
      {!file && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center cursor-pointer hover:bg-slate-100/60 transition-all shadow-xs max-w-lg mx-auto"
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3 shadow-xs">
            ✂️
          </div>
          <p className="text-base font-extrabold text-black">Click or Drag & Drop Photo Here</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Aspect Ratio Presets • Passport, 1:1, 16:9 • 100% Free</p>
        </div>
      )}

      {/* UNIFIED TOP RIBBON & CROP WORKSPACE */}
      {file && previewUrl && (
        <div className="space-y-6">
          
          {/* USER REQUESTED UNIFIED TOP RIBBON (IMAGE 4 TOP FIX) */}
          <div className="bg-white px-6 py-2.5 rounded-full border border-slate-200 shadow-md flex items-center justify-between gap-4 max-w-4xl mx-auto overflow-x-auto">
            <div className="flex items-center gap-2 py-1">
              {(['free', '1:1', '4:3', '16:9', 'passport'] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => {
                    setAspectRatio(ratio);
                    if (ratio === '1:1') setCropBox({ x: 15, y: 15, width: 70, height: 70 });
                    else if (ratio === '16:9') setCropBox({ x: 5, y: 20, width: 90, height: 50 });
                    else if (ratio === 'passport') setCropBox({ x: 25, y: 10, width: 50, height: 75 });
                    else setCropBox({ x: 10, y: 10, width: 80, height: 80 });
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                    aspectRatio === ratio ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {ratio}
                </button>
              ))}

              <button
                onClick={handleGenerateCrop}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-full transition-all shadow-xs cursor-pointer ml-1"
              >
                ✂️ Preview Crop
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

            {/* PURE ICON BUTTONS MATCHING IMAGE 3 */}
            <div className="flex items-center gap-2">
              <button
                onMouseDown={() => setIsHoldingOriginal(true)}
                onMouseUp={() => setIsHoldingOriginal(false)}
                onMouseLeave={() => setIsHoldingOriginal(false)}
                onTouchStart={() => setIsHoldingOriginal(true)}
                onTouchEnd={() => setIsHoldingOriginal(false)}
                className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 text-base rounded-full flex items-center justify-center transition-all cursor-pointer select-none touch-none"
                title="Hold to view original photo"
              >
                👁️
              </button>

              <button
                onClick={handleDownload}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm px-6 py-2 rounded-full transition-all shadow-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap ml-1"
              >
                <span>Download</span>
                <span className="text-xs">∨</span>
              </button>
            </div>
          </div>

          {/* CENTER CROP CANVAS VIEW */}
          <div className="flex justify-center">
            <div
              ref={containerRef}
              className="relative inline-block overflow-hidden rounded-3xl border border-slate-300 bg-slate-100 max-w-full shadow-xl select-none touch-none min-h-[300px]"
            >
              <img
                src={isHoldingOriginal ? previewUrl : (croppedUrl || previewUrl)}
                alt="Crop Preview"
                className="max-h-[500px] w-auto block mx-auto rounded-2xl"
              />

              {!croppedUrl && !isHoldingOriginal && (
                <div
                  onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
                  onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
                  className="absolute border-2 border-dashed border-blue-600 bg-blue-500/20 shadow-2xl cursor-move touch-none"
                  style={{
                    top: `${cropBox.y}%`,
                    left: `${cropBox.x}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`,
                  }}
                >
                  <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full absolute -top-3.5 left-2 shadow pointer-events-none uppercase">
                    Crop Region ({aspectRatio})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM CONTROL TRAY */}
          <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-black font-black text-2xl rounded-2xl flex items-center justify-center transition-all shadow-xs cursor-pointer"
              title="Write new / Choose from files"
            >
              +
            </button>

            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200/80 p-1.5 pr-3 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-black max-w-[140px] truncate">{file.name}</span>
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
