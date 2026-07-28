'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useFileContext } from '../../context/FileContext';
import { addHistoryItem } from '@/lib/historyStore';
import Tesseract from 'tesseract.js';

export default function MultiHubClient() {
  const { files, activeFile, addFiles, removeFile, activeIndex, setActiveIndex } = useFileContext();
  
  // Multi-Hub Active Tool Tab
  const [activeTab, setActiveTab] = useState<'resizer' | 'compressor' | 'ocr' | 'watermark' | 'bg' | 'editor' | 'barcode'>('resizer');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Resizer state
  const [width, setWidth] = useState<string>('1080');
  const [height, setHeight] = useState<string>('2400');
  const [maintainRatio, setMaintainRatio] = useState<boolean>(true);
  const [imgFormat, setImgFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [origRatio, setOrigRatio] = useState<number | null>(null);

  // Compressor state
  const [targetKb, setTargetKb] = useState<string>('200');

  // OCR state
  const [ocrText, setOcrText] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-load active file dimensions & preview URL
  useEffect(() => {
    if (!activeFile) {
      setPreviewUrl(null);
      return;
    }
    if (activeFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(activeFile);
      setPreviewUrl(url);
      const img = new Image();
      img.onload = () => {
        setWidth(img.width.toString());
        setHeight(img.height.toString());
        setOrigRatio(img.width / img.height);
      };
      img.src = url;
    } else {
      setPreviewUrl(null);
    }
  }, [activeFile]);

  const handleWidthChange = (val: string) => {
    setWidth(val);
    if (maintainRatio && origRatio && !isNaN(parseFloat(val))) {
      setHeight(Math.round(parseFloat(val) / origRatio).toString());
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
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
      toolName: 'Multi-Tools Hub',
      downloadUrl: url,
      fileSizeText: `${(blob.size / 1024).toFixed(1)} KB`,
    });
  };

  const handleResize = async () => {
    if (!activeFile || !previewUrl) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = previewUrl;
      await new Promise((res) => (img.onload = res));

      const targetW = parseInt(width) || img.width;
      const targetH = parseInt(height) || img.height;

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
          triggerDownload(blob, `resized_${activeFile.name.split('.')[0]}.${imgFormat}`);
        }
        setIsProcessing(false);
      }, `image/${imgFormat}`, 0.92);
    } catch (err) {
      console.error(err);
      alert('Error resizing image.');
      setIsProcessing(false);
    }
  };

  const handleCompress = async () => {
    if (!activeFile || !previewUrl) return;
    setIsProcessing(true);

    try {
      const targetBytes = (parseFloat(targetKb) || 200) * 1024;
      const img = new Image();
      img.src = previewUrl;
      await new Promise((res) => (img.onload = res));

      let curW = img.width;
      let curH = img.height;
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
            canvas.toBlob((b) => res(b), 'image/jpeg', midQ)
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
            bestBlob = await new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.05));
            break;
          }
        }
      }

      if (bestBlob) {
        triggerDownload(bestBlob, `compressed_${activeFile.name.split('.')[0]}.jpg`);
      }
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      alert('Error compressing file.');
      setIsProcessing(false);
    }
  };

  const handleRunOcr = async () => {
    if (!activeFile) return;
    setOcrLoading(true);
    try {
      const worker = await Tesseract.createWorker('eng');
      const ret = await worker.recognize(activeFile);
      setOcrText(ret.data.text);
      await worker.terminate();
    } catch (err) {
      console.error(err);
      alert('OCR failed.');
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title Header with ← Back to Home Link */}
      <div>
        <Link href="/" className="text-blue-600 font-bold hover:underline text-xs block text-left mb-2 w-fit">
          ← Back to Home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-black">⚡ Multi-Tools Hub</h1>
        <p className="text-slate-500 text-xs mt-0.5">Pre-loaded file workspace. All Paperless tools in one clean hub.</p>
      </div>

      <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

      {/* INITIAL FILE DROP BOX (WHEN NO FILES LOADED) */}
      {files.length === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-white p-10 rounded-3xl border-2 border-dashed border-blue-400 text-center shadow-sm cursor-pointer hover:bg-slate-50 transition-all space-y-3 max-w-lg mx-auto"
        >
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-xs">
            ⚡
          </div>
          <p className="font-extrabold text-base text-black">Click or Drag & Drop Files Here to Start</p>
          <p className="text-xs text-slate-400 font-medium">Supports PDF, PNG, JPG, WEBP, DOCX</p>
        </div>
      )}

      {/* WORKSPACE WHEN FILES PRE-LOADED IN CONTEXT */}
      {files.length > 0 && activeFile && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          
          {/* 2-ROW WRAPPING FLEX RIBBON ON MOBILE */}
          <div className="bg-slate-100/80 p-1.5 rounded-[20px] sm:rounded-full border border-slate-200/80 flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 max-w-2xl mx-auto">
            {[
              { id: 'resizer', label: '📏 Resize & Format' },
              { id: 'compressor', label: '🗜️ Target KB Compress' },
              { id: 'ocr', label: '🔍 OCR Scan' },
              { id: 'bg', label: '🎨 BG Swap' },
              { id: 'editor', label: '📝 PDF Editor' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ACTIVE FILE PREVIEW CANVAS (RESTORED PREVIEW) */}
          {previewUrl && (
            <div className="flex justify-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs inline-block">
                <img src={previewUrl} alt="Active preview" className="max-h-48 w-auto block object-contain rounded-xl" />
              </div>
            </div>
          )}

          {/* TAB 1: RESIZER & FORMAT CONVERTER */}
          {activeTab === 'resizer' && (
            <div className="space-y-4 max-w-md mx-auto text-center">
              <label className="text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-center gap-1.5">
                <input
                  type="checkbox"
                  checked={maintainRatio}
                  onChange={(e) => setMaintainRatio(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <span>Maintain Aspect Ratio</span>
              </label>

              <div className="flex items-center justify-center gap-3">
                <div className="flex-1 text-left">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Width (PX)</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center text-sm font-black text-black focus:outline-none"
                  />
                </div>

                <span className="text-slate-400 font-bold text-lg pt-4">X</span>

                <div className="flex-1 text-left">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Height (PX)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-center text-sm font-black text-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-500">Output Format:</span>
                <select
                  value={imgFormat}
                  onChange={(e) => setImgFormat(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-black text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="webp">WEBP</option>
                </select>
              </div>

              <button
                onClick={handleResize}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm py-3 px-8 rounded-xl transition-all shadow-md w-full cursor-pointer"
              >
                {isProcessing ? 'Processing Canvas...' : 'Resize & Download Image'}
              </button>
            </div>
          )}

          {/* TAB 2: COMPRESSOR */}
          {activeTab === 'compressor' && (
            <div className="space-y-4 max-w-sm mx-auto text-center">
              <div>
                <label className="block text-xs font-bold text-black uppercase mb-1">Target KB File Weight</label>
                <input
                  type="number"
                  value={targetKb}
                  onChange={(e) => setTargetKb(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-center text-lg font-black text-black focus:outline-none"
                />
              </div>

              <button
                onClick={handleCompress}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm py-3 px-8 rounded-xl transition-all shadow-md w-full cursor-pointer"
              >
                {isProcessing ? 'Compressing File...' : `Compress under ${targetKb} KB & Download`}
              </button>
            </div>
          )}

          {/* TAB 3: OCR */}
          {activeTab === 'ocr' && (
            <div className="space-y-4 max-w-md mx-auto text-center">
              <button
                onClick={handleRunOcr}
                disabled={ocrLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                {ocrLoading ? 'Scanning Text...' : '📷 Run OCR Text Scan'}
              </button>

              {ocrText && (
                <textarea
                  rows={5}
                  readOnly
                  value={ocrText}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-black text-xs font-mono"
                />
              )}
            </div>
          )}

           {/* TAB 5: BG CHANGER */}
          {activeTab === 'bg' && (
            <div className="text-center py-3 space-y-3">
              <p className="text-xs font-bold text-slate-600">Open photo background replacement suite:</p>
              <Link href="/tools/bg-changer" className="inline-block bg-slate-900 text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-black transition-all">
                Open Photo Background Editor ➔
              </Link>
            </div>
          )}

          {/* TAB 6: EDITOR */}
          {activeTab === 'editor' && (
            <div className="text-center py-3 space-y-3">
              <p className="text-xs font-bold text-slate-600">Open PDF document text eraser & signature stamp suite:</p>
              <Link href="/tools/pdf-editor" className="inline-block bg-slate-900 text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-black transition-all">
                Open PDF Editor ➔
              </Link>
            </div>
          )}

          {/* BOTTOM TRAY WITH + BUTTON AND ACTIVE FILE PILLS */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-black font-black text-2xl rounded-2xl flex items-center justify-center transition-all shadow-xs cursor-pointer"
              title="Write new / Choose from files"
            >
              +
            </button>

            {files.map((f, idx) => (
              <div
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`flex items-center gap-2 p-1.5 pr-3 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                  activeIndex === idx ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <span className="text-xs font-bold text-black max-w-[130px] truncate">{f.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  className="text-slate-400 hover:text-red-600 text-xs font-bold p-0.5 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
