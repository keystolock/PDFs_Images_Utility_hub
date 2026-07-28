'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { addHistoryItem } from '@/lib/historyStore';

export default function BgChangerClient() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawAiBlob, setRawAiBlob] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  // Editing States
  const [activeTab, setActiveTab] = useState<'background'>('background');
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [edgeMode, setEdgeMode] = useState<'balanced' | 'sharp' | 'soft'>('balanced');
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    runAiBackgroundRemoval(file);
  }, [file]);

  // Mobile Memory Downscaling (Max 1024px dimension) to prevent crashes
  const downscaleImageForMobile = async (sourceFile: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(sourceFile);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_DIM = 1024;
        let w = img.width;
        let h = img.height;

        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          } else {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => resolve(blob || sourceFile), 'image/png');
        } else {
          resolve(sourceFile);
        }
      };
      img.onerror = () => resolve(sourceFile);
      img.src = url;
    });
  };

  // WebAssembly / WebGL AI Background Removal Engine
  const runAiBackgroundRemoval = async (sourceFile: File) => {
    setIsProcessing(true);

    try {
      const optimizedBlob = await downscaleImageForMobile(sourceFile);
      const origUrl = URL.createObjectURL(optimizedBlob);
      setPreviewUrl(origUrl);

      const imgly = await import('@imgly/background-removal');
      const removeFn = imgly.removeBackground || imgly.default;

      const resultBlob = await removeFn(optimizedBlob);

      setRawAiBlob(resultBlob);
      applyEdgeAndBackground(resultBlob, bgColor, edgeMode, origUrl);
    } catch (err) {
      console.error('WASM AI Background Removal Error:', err);
      alert('AI Background Removal encountered an error. Falling back to clean image.');
      setRawAiBlob(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render Final Canvas Layer with Edge Cleanup Filters & Solid Color Fills
  const applyEdgeAndBackground = async (
    aiBlob: Blob | null,
    colorFill: string,
    edgeFilter: 'balanced' | 'sharp' | 'soft',
    originalUrl: string | null = previewUrl
  ) => {
    if (!aiBlob || !originalUrl) return;

    try {
      const cutoutImg = new Image();
      const cutoutUrl = URL.createObjectURL(aiBlob);
      cutoutImg.src = cutoutUrl;
      await new Promise((res) => (cutoutImg.onload = res));

      const canvas = document.createElement('canvas');
      canvas.width = cutoutImg.width;
      canvas.height = cutoutImg.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (colorFill !== 'transparent') {
        ctx.fillStyle = colorFill;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (edgeFilter === 'soft') {
        ctx.filter = 'blur(1.5px)';
      } else if (edgeFilter === 'sharp') {
        ctx.filter = 'contrast(125%)';
      } else {
        ctx.filter = 'none';
      }

      ctx.drawImage(cutoutImg, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          if (processedUrl) URL.revokeObjectURL(processedUrl);
          setProcessedUrl(URL.createObjectURL(blob));
        }
        URL.revokeObjectURL(cutoutUrl);
      }, 'image/png');
    } catch (e) {
      console.error(e);
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
    setRawAiBlob(null);
    setProcessedUrl(null);
  };

  const handleDownload = () => {
    const downloadTarget = processedUrl || previewUrl;
    if (!downloadTarget || !file) return;

    const a = document.createElement('a');
    a.href = downloadTarget;
    a.download = `cutout_${file.name.split('.')[0]}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addHistoryItem({
      filename: `cutout_${file.name.split('.')[0]}.png`,
      toolName: 'Background Editor',
      downloadUrl: downloadTarget,
      fileSizeText: 'AI Cutout PNG',
    });
  };

  const transparentBgStyle = {
    backgroundImage: `linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)`,
    backgroundSize: `20px 20px`,
    backgroundPosition: `0 0, 0 10px, 10px -10px, -10px 0px`,
    backgroundColor: '#f8fafc',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title Header */}
      <div>
        <Link href="/" className="text-blue-600 font-bold hover:underline text-xs inline-block mb-1">
          ← Back to Home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-black">AI Photo Background Remover</h1>
        <p className="text-slate-500 text-xs mt-0.5">100% Client-side WebAssembly / WebGL AI segmentation. Free, unlimited & private.</p>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {/* INITIAL FILE DROP CONTAINER */}
      {!file && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center cursor-pointer hover:bg-slate-100/60 transition-all shadow-xs max-w-lg mx-auto"
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3 shadow-xs">
            ✨
          </div>
          <p className="text-base font-extrabold text-black">Click or Drag & Drop Photo Here</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Automatic WebAssembly AI Cutout • 100% Free & Unlimited</p>
        </div>
      )}

      {/* IMAGE 3 RIBBON WORKSPACE */}
      {file && previewUrl && (
        <div className="space-y-6">
          
          {/* IMAGE 3 PURE ICON RIBBON TOOLBAR (ADJUST EDGE AND DESIGN REMOVED) */}
          <div className="bg-white px-6 py-2.5 rounded-full border border-slate-200 shadow-md flex items-center justify-between gap-4 max-w-4xl mx-auto overflow-x-auto">
            <div className="flex items-center gap-3 py-1">
              <button
                className="px-4 py-2 rounded-full text-xs font-bold bg-slate-100 text-slate-900 shadow-xs flex items-center gap-1.5"
              >
                🖼️ Background
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
                onClick={() => setBgColor('transparent')}
                className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 text-base rounded-full flex items-center justify-center transition-all cursor-pointer"
                title="Undo"
              >
                ↶
              </button>

              <button
                onClick={() => setBgColor('#ffffff')}
                className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 text-base rounded-full flex items-center justify-center transition-all cursor-pointer"
                title="Redo"
              >
                ↷
              </button>

              {/* Blue Download Button */}
              <button
                onClick={handleDownload}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 rounded-full transition-all shadow-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap ml-1"
              >
                <span>Download</span>
                <span className="text-xs">∨</span>
              </button>
            </div>
          </div>

          {/* MAIN SPLIT WORKSPACE */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center justify-center">
            
            {/* CENTER PHOTO PREVIEW CARD */}
            <div className="md:col-span-7 flex justify-center">
              <div
                className="relative p-6 rounded-[32px] border border-slate-200 shadow-xl overflow-hidden max-w-full flex items-center justify-center select-none touch-none min-h-[340px]"
                style={isHoldingOriginal ? { backgroundColor: '#ffffff' } : (bgColor === 'transparent' ? transparentBgStyle : { backgroundColor: bgColor })}
              >
                <img
                  src={isHoldingOriginal ? previewUrl : (processedUrl || previewUrl)}
                  alt="AI Cutout Preview"
                  className="max-h-[440px] w-auto block object-contain rounded-2xl shadow-md transition-all duration-200"
                />

                {/* EXACT USER REQUESTED OVERLAY LOADING TEXT (IMAGE 1) */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center rounded-[32px] p-6 text-center">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl space-y-3 max-w-xs border border-slate-100">
                      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-black font-extrabold text-sm leading-snug">
                        AI is processing. This may take a few seconds. Please wait.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SIDE PANEL: SWATCH COLOR GRID */}
            <div className="md:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-extrabold text-black text-sm uppercase tracking-wider">BACKGROUND PALETTE</h3>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => {
                      setBgColor('transparent');
                      applyEdgeAndBackground(rawAiBlob, 'transparent', edgeMode);
                    }}
                    className={`h-12 rounded-2xl border-2 flex items-center justify-center text-lg font-bold transition-all cursor-pointer shadow-xs ${
                      bgColor === 'transparent' ? 'border-blue-600 ring-2 ring-blue-300' : 'border-slate-200'
                    }`}
                    style={transparentBgStyle}
                    title="Transparent Background"
                  >
                    🚫
                  </button>

                  {[
                    '#ffffff', '#000000', '#3b82f6', '#8b5cf6',
                    '#ec4899', '#ef4444', '#f97316', '#eab308',
                    '#10b981', '#06b6d4', '#64748b', '#475569'
                  ].map((hex) => (
                    <button
                      key={hex}
                      onClick={() => {
                        setBgColor(hex);
                        applyEdgeAndBackground(rawAiBlob, hex, edgeMode);
                      }}
                      className={`h-12 rounded-2xl border-2 transition-all cursor-pointer shadow-xs ${
                        bgColor === hex ? 'border-blue-600 scale-105 ring-2 ring-blue-300' : 'border-slate-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-600">Custom Color Picker:</span>
                  <input
                    type="color"
                    value={bgColor === 'transparent' ? '#ffffff' : bgColor}
                    onChange={(e) => {
                      const hex = e.target.value;
                      setBgColor(hex);
                      applyEdgeAndBackground(rawAiBlob, hex, edgeMode);
                    }}
                    className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white shadow-xs"
                  />
                </div>
              </div>
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
              <img src={previewUrl} alt="Thumbnail" className="w-9 h-9 object-cover rounded-xl border border-slate-300" />
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
