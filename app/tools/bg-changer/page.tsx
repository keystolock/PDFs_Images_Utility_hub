'use client';
import { useState, useRef, useEffect } from 'react';
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

interface CropBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

import { addHistoryItem } from '@/lib/historyStore';

export default function BgChangerPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  // Interactive Edit States
  const [bgMode, setBgMode] = useState<'remove' | 'color'>('remove');
  const [bgColor, setBgColor] = useState('#3b82f6');
  const [rotation, setRotation] = useState<number>(0);

  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);

  // Responsive Interactive Drag Crop States (Defaults to 100% full bounds)
  const [isCropMode, setIsCropMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cropBox, setCropBox] = useState<CropBox>({ startX: 0, startY: 0, endX: 100, endY: 100 });

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: FileItem[] = Array.from(e.target.files).map((file) => {
      const id = Math.random().toString(36).substring(2, 9);
      return {
        file,
        id,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        progress: 0,
      };
    });

    setFiles((prev) => {
      const updated = [...prev, ...newFiles];
      if (!activeFileId && updated.length > 0) {
        setActiveFileId(updated[0].id);
      }
      return updated;
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (activeFileId === id) {
        setActiveFileId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const activeFile = files.find((f) => f.id === activeFileId);

  // Interactive Drag & Touch Crop Handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!isCropMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    setIsDragging(true);
    setCropBox({ startX: x, startY: y, endX: x, endY: y });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging || !isCropMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    setCropBox((prev) => ({ ...prev, endX: x, endY: y }));
  };

  const handlePointerUp = () => {
    if (isCropMode) setIsDragging(false);
  };

  // Real Canvas Background Isolation & Crop Pipeline
  const startProcessing = async (id: string) => {
    const targetItem = files.find((item) => item.id === id);
    if (!targetItem) return;

    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'processing', progress: 30 } : item))
    );

    try {
      const img = new Image();
      img.src = targetItem.previewUrl;
      await new Promise((res) => (img.onload = res));

      // 1. Isolate foreground subject cleanly
      let fgImage: HTMLImageElement;
      let usedAiSegmentation = false;

      try {
        const imgly = await import('@imgly/background-removal');
        const removeBackgroundFn = imgly.removeBackground || imgly.default;
        const bgRemovedBlob = await removeBackgroundFn(targetItem.file, {
          progress: (key: string, current: number, total: number) => {
            if (total > 0) {
              const p = Math.round((current / total) * 100);
              setFiles((prev) =>
                prev.map((item) => (item.id === id ? { ...item, progress: Math.min(90, 30 + Math.round(p * 0.6)) } : item))
              );
            }
          },
        });

        fgImage = new Image();
        fgImage.src = URL.createObjectURL(bgRemovedBlob);
        await new Promise((res) => (fgImage.onload = res));
        usedAiSegmentation = true;
      } catch (e) {
        console.warn('Fallback to canvas threshold segmentation:', e);
        // Fallback canvas threshold
        fgImage = img;
      }

      // Calculate Crop coordinates based on original image
      const cropMinX = Math.min(cropBox.startX, cropBox.endX);
      const cropMinY = Math.min(cropBox.startY, cropBox.endY);
      const cropWidthPercent = Math.abs(cropBox.endX - cropBox.startX) || 100;
      const cropHeightPercent = Math.abs(cropBox.endY - cropBox.startY) || 100;

      const sourceX = (cropMinX / 100) * fgImage.width;
      const sourceY = (cropMinY / 100) * fgImage.height;
      const sourceW = (cropWidthPercent / 100) * fgImage.width;
      const sourceH = (cropHeightPercent / 100) * fgImage.height;

      const canvas = document.createElement('canvas');
      canvas.width = sourceW;
      canvas.height = sourceH;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas context unavailable');

      // Apply rotation if needed
      if (rotation !== 0) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
      }

      // Draw solid color background globally behind the subject if requested
      if (bgMode === 'color') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw isolated subject segment onto canvas
      ctx.drawImage(fgImage, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);

      // If AI segmentation wasn't available and transparent mode was selected, do threshold fallback
      if (!usedAiSegmentation && bgMode === 'remove') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        const cornerR = data[0];
        const cornerG = data[1];
        const cornerB = data[2];

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const diff = Math.abs(r - cornerR) + Math.abs(g - cornerG) + Math.abs(b - cornerB);

          if (diff < 45 || (r > 240 && g > 240 && b > 240)) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const msg = bgMode === 'remove' ? 'Isolated Subject (Transparent)' : `Solid Color Fill (${bgColor})`;
          const finalMsg = `${msg} • ${Math.round(sourceW)}×${Math.round(sourceH)}px`;

          addHistoryItem({
            filename: `bg_edited_${activeFile ? activeFile.file.name.split('.')[0] : 'image'}.png`,
            toolName: 'Background Editor',
            downloadUrl: url,
            fileSizeText: finalMsg,
          });

          setFiles((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: 'success',
                    progress: 100,
                    downloadUrl: url,
                    finalMessage: finalMsg,
                  }
                : item
            )
          );
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      alert('Error processing image background/crop.');
      setFiles((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'error' } : item))
      );
    }
  };

  // Generate checkerboard CSS dynamically
  const transparentBgStyle = {
    backgroundImage: `linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)`,
    backgroundSize: `20px 20px`,
    backgroundPosition: `0 0, 0 10px, 10px -10px, -10px 0px`,
    backgroundColor: '#f8fafc',
  };

  const solidColorStyle = {
    backgroundColor: bgColor,
    backgroundImage: 'none',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link href="/" className="text-blue-600 font-semibold hover:underline cursor-pointer text-sm mb-4 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-black">Interactive Photo & Background Editor</h1>
        <p className="text-slate-600 text-sm mt-2">Isolate subjects, apply solid background color replacements, or drag to crop responsive frames.</p>
      </div>

      {files.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-blue-200 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center text-2xl">
            🖼️
          </div>
          <div>
            <h3 className="font-bold text-black text-lg">Upload an image to start editing</h3>
            <p className="text-slate-400 text-xs mt-1">Supports PNG, JPG, WEBP</p>
          </div>
          <label className="inline-block bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-8 py-3.5 rounded-full cursor-pointer shadow-lg transition-all text-sm">
            Select Photos
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Interactive Visual Preview Canvas */}
          <div className="lg:col-span-7 bg-slate-900 p-6 rounded-3xl shadow-xl flex flex-col items-center justify-center min-h-[480px] relative overflow-hidden select-none">
            {activeFile ? (
              <div className="relative flex flex-col items-center space-y-4 w-full">
                <div className="flex justify-between w-full text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                  <span>Live Preview ({activeFile.file.name})</span>
                  {isCropMode && <span className="text-blue-400 animate-pulse">💡 Drag/Touch frame to crop</span>}
                </div>

                {/* Interactive Image Container with Mouse & Touch Event Listeners */}
                <div 
                  ref={containerRef}
                  onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                  onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                  onMouseUp={handlePointerUp}
                  onTouchStart={(e) => handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)}
                  onTouchMove={(e) => handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)}
                  onTouchEnd={handlePointerUp}
                  className={`relative transition-all duration-300 max-w-full flex items-center justify-center p-6 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl touch-none ${
                    isCropMode ? 'cursor-crosshair' : 'cursor-default'
                  }`}
                  style={isHoldingOriginal ? { backgroundColor: '#ffffff' } : (bgMode === 'color' ? solidColorStyle : transparentBgStyle)}
                >
                  <img
                    src={isHoldingOriginal ? activeFile.previewUrl : (activeFile.downloadUrl || activeFile.previewUrl)}
                    alt="Preview"
                    className="max-h-[520px] w-auto object-contain transition-transform duration-300 rounded-lg shadow-md pointer-events-none"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                    }}
                  />

                  {/* Crop Selection Box (Visible when Crop Mode is active) */}
                  {isCropMode && (
                    <div
                      className="absolute border-2 border-blue-400 bg-blue-500/20 pointer-events-none rounded shadow-lg"
                      style={{
                        left: `${Math.min(cropBox.startX, cropBox.endX)}%`,
                        top: `${Math.min(cropBox.startY, cropBox.endY)}%`,
                        width: `${Math.abs(cropBox.endX - cropBox.startX)}%`,
                        height: `${Math.abs(cropBox.endY - cropBox.startY)}%`,
                      }}
                    >
                      <span className="absolute -top-5 left-0 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                        Crop Bounds
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Action Toolbar */}
                <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-800/80 backdrop-blur p-3 rounded-2xl border border-slate-700 w-full">
                  <span className="text-xs font-bold text-slate-300 mr-2">Controls:</span>
                  <button
                    onMouseDown={() => setIsHoldingOriginal(true)}
                    onMouseUp={() => setIsHoldingOriginal(false)}
                    onMouseLeave={() => setIsHoldingOriginal(false)}
                    onTouchStart={() => setIsHoldingOriginal(true)}
                    onTouchEnd={() => setIsHoldingOriginal(false)}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer select-none touch-none"
                  >
                    👁️ Hold for Original
                  </button>
                  <button 
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    🔄 Rotate 90°
                  </button>
                  <button 
                    onClick={() => {
                      setIsCropMode(!isCropMode);
                      if (!isCropMode) setCropBox({ startX: 0, startY: 0, endX: 100, endY: 100 });
                    }}
                    className={`${isCropMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'} text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer`}
                  >
                    {isCropMode ? '✅ Confirm Crop Box' : '✂️ Enable Responsive Crop'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Select an image from the queue</p>
            )}
          </div>

          {/* Right Side: Settings Panel */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h2 className="font-bold text-black text-lg">Editing Tools</h2>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                + Add More
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
            </div>

            {/* Background Controls */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-black">Background Replacement</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBgMode('remove')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    bgMode === 'remove' ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  ✨ Transparent BG
                </button>
                <button
                  onClick={() => setBgMode('color')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    bgMode === 'color' ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  🎨 Solid Color Fill
                </button>
              </div>

              {/* Color Swatches */}
              {bgMode === 'color' && (
                <div className="pt-2 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">Choose Global BG Color:</span>
                    <input 
                      type="color" 
                      value={bgColor} 
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white" 
                    />
                  </div>
                  <div className="flex gap-2">
                    {['#ffffff', '#000000', '#3b82f6', '#ef4444', '#10b981', '#f59e0b'].map((hex) => (
                      <button
                        key={hex}
                        onClick={() => setBgColor(hex)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer shadow-sm ${
                          bgColor === hex ? 'scale-110 border-blue-600' : 'border-white hover:scale-105'
                        }`}
                        style={{ backgroundColor: hex }}
                      ></button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Active Queue Selection Bar */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-sm font-bold text-black">Active Queue ({files.length})</label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {files.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => setActiveFileId(item.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                      activeFileId === item.id ? 'bg-blue-50/50 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <img src={item.previewUrl} alt="thumb" className="w-8 h-8 object-cover rounded-lg border border-slate-200" />
                      <div className="truncate">
                        <p className="font-semibold text-black text-xs truncate">{item.file.name}</p>
                        <p className="text-slate-400 text-[10px]">{(item.file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === 'success' && item.downloadUrl ? (
                        <a
                          href={item.downloadUrl}
                          download={`edited-${item.file.name}`}
                          className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ↓ Download
                        </a>
                      ) : item.status === 'processing' ? (
                        <span className="text-blue-600 text-[10px] font-bold animate-pulse">Processing...</span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); startProcessing(item.id); }}
                          className="bg-slate-900 hover:bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                        >
                          Process
                        </button>
                      )}
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(item.id); }}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}