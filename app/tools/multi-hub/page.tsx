'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useFileContext } from '../../context/FileContext';
import { UniversalFilePreview } from '../../components/UniversalFilePreview';
import Tesseract from 'tesseract.js';

export default function MultiToolsHubPage() {
  const { files, activeFile, setFiles, addFiles, removeFile, activeIndex, setActiveIndex } = useFileContext();
  const [activeTab, setActiveTab] = useState<'resizer' | 'compressor' | 'converter' | 'ocr' | 'watermark' | 'bg'>('resizer');

  // Resizer State
  const [width, setWidth] = useState('1920');
  const [height, setHeight] = useState('1080');
  const [lockRatio, setLockRatio] = useState(true);
  const [imgFormat, setImgFormat] = useState('png');
  const [origRatio, setOrigRatio] = useState<number | null>(null);

  // Compressor State
  const [targetKb, setTargetKb] = useState('200');

  // OCR State
  const [ocrText, setOcrText] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  // General Status & Download
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // Set initial dimensions when activeFile changes
  useEffect(() => {
    if (!activeFile) return;
    if (activeFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(activeFile);
      const img = new Image();
      img.onload = () => {
        setWidth(img.width.toString());
        setHeight(img.height.toString());
        setOrigRatio(img.width / img.height);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  }, [activeFile]);

  // Width change handler with lock ratio
  const handleWidthChange = (val: string) => {
    setWidth(val);
    if (lockRatio && origRatio && !isNaN(parseFloat(val))) {
      setHeight(Math.round(parseFloat(val) / origRatio).toString());
    }
  };

  // Quick Preset Handlers
  const applyPreset = (type: 'passport' | 'signature' | 'pancard' | 'ssc_photo' | 'ssc_sig' | 'upsc_photo' | 'bank_sig' | 'compress200') => {
    setActiveTab('resizer');
    setUnit('px');
    if (type === 'passport') {
      // 3.5cm x 4.5cm at 300 DPI = 413 x 531 px
      setWidth('413');
      setHeight('531');
      setImgFormat('jpg');
    } else if (type === 'signature') {
      setWidth('256');
      setHeight('64');
      setImgFormat('png');
    } else if (type === 'pancard') {
      setWidth('217');
      setHeight('295');
      setImgFormat('jpg');
    } else if (type === 'ssc_photo') {
      setWidth('413');
      setHeight('531');
      setImgFormat('jpg');
    } else if (type === 'ssc_sig') {
      setWidth('472');
      setHeight('236');
      setImgFormat('jpg');
    } else if (type === 'upsc_photo') {
      setWidth('350');
      setHeight('350');
      setImgFormat('jpg');
    } else if (type === 'bank_sig') {
      setWidth('140');
      setHeight('60');
      setImgFormat('jpg');
    } else if (type === 'compress200') {
      setActiveTab('compressor');
      setTargetKb('200');
    }
  };

  // Instant Download Helper
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Unit & DPI State
  const [unit, setUnit] = useState<'px' | 'cm' | 'mm' | 'in'>('px');
  const [dpi, setDpi] = useState<number>(300);

  // Resize Mode State: 'dimensions' | 'percentage'
  const [resizeMode, setResizeMode] = useState<'dimensions' | 'percentage'>('dimensions');
  const [percentScale, setPercentScale] = useState<string>('50');

  const getPixelVal = (valStr: string, u: 'px' | 'cm' | 'mm' | 'in', currentDpi: number) => {
    const val = parseFloat(valStr) || 0;
    if (u === 'in') return Math.round(val * currentDpi);
    if (u === 'cm') return Math.round((val / 2.54) * currentDpi);
    if (u === 'mm') return Math.round((val / 25.4) * currentDpi);
    return Math.round(val);
  };

  // Perform Image Resizing, Physical Unit Calculation & Format Conversion
  const handleResizeAndDownload = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    setProgressMsg('Rendering resized image on canvas...');

    try {
      const url = URL.createObjectURL(activeFile);
      const img = new Image();
      img.src = url;
      await new Promise((res) => (img.onload = res));

      let targetW = img.width;
      let targetH = img.height;

      if (resizeMode === 'percentage') {
        const pct = (parseFloat(percentScale) || 100) / 100;
        targetW = Math.max(1, Math.round(img.width * pct));
        targetH = Math.max(1, Math.round(img.height * pct));
      } else {
        targetW = getPixelVal(width, unit, dpi) || img.width;
        targetH = getPixelVal(height, unit, dpi) || img.height;
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);
      }

      const mimeType = `image/${imgFormat}`;
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, `resized_${activeFile.name.split('.')[0]}.${imgFormat}`);
        }
        URL.revokeObjectURL(url);
        setIsProcessing(false);
      }, mimeType, 0.92);
    } catch (err) {
      console.error(err);
      alert('Error resizing image.');
      setIsProcessing(false);
    }
  };

  // Binary Search Target KB Compression via Canvas Quality & Scaling Loop
  const handleCompressAndDownload = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    setProgressMsg(`Compressing file strictly under ${targetKb} KB...`);

    try {
      const targetBytes = (parseFloat(targetKb) || 200) * 1024;
      const url = URL.createObjectURL(activeFile);
      const img = new Image();
      img.src = url;
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
        downloadBlob(bestBlob, `compressed_${activeFile.name.split('.')[0]}.jpg`);
      }
      URL.revokeObjectURL(url);
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      alert('Error compressing image.');
      setIsProcessing(false);
    }
  };

  // Perform Tesseract.js Client-Side OCR
  const handleRunOcr = async () => {
    if (!activeFile) return;
    setOcrLoading(true);
    setOcrProgress(0);

    try {
      const worker = await Tesseract.createWorker('eng');
      const ret = await worker.recognize(activeFile);
      setOcrText(ret.data.text);
      await worker.terminate();
    } catch (err) {
      console.error(err);
      alert('OCR extraction failed.');
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <Link href="/" className="text-blue-600 font-semibold hover:underline text-xs mb-2 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
            ⚡ Multi-Tools Hub Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            All utilities in one place. Your files are pre-loaded in memory for instant manipulation.
          </p>
        </div>

        {/* One-Click Quick Presets (Official Exam & Govt Forms) */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => applyPreset('passport')}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold px-3 py-2 rounded-xl border border-blue-200 transition-all cursor-pointer shadow-xs"
          >
            📸 Passport Photo (3.5x4.5cm)
          </button>
          <button
            onClick={() => applyPreset('ssc_photo')}
            className="bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-extrabold px-3 py-2 rounded-xl border border-sky-200 transition-all cursor-pointer shadow-xs"
          >
            📜 SSC Photo (20-50KB)
          </button>
          <button
            onClick={() => applyPreset('upsc_photo')}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold px-3 py-2 rounded-xl border border-indigo-200 transition-all cursor-pointer shadow-xs"
          >
            🏛️ UPSC Photo (350x350px)
          </button>
          <button
            onClick={() => applyPreset('bank_sig')}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold px-3 py-2 rounded-xl border border-emerald-200 transition-all cursor-pointer shadow-xs"
          >
            🏦 Bank Sig (140x60px)
          </button>
          <button
            onClick={() => applyPreset('signature')}
            className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-extrabold px-3 py-2 rounded-xl border border-purple-200 transition-all cursor-pointer shadow-xs"
          >
            ✍️ Signature (256x64px)
          </button>
          <button
            onClick={() => applyPreset('compress200')}
            className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-extrabold px-3 py-2 rounded-xl border border-amber-200 transition-all cursor-pointer shadow-xs"
          >
            🗜️ Compress &lt; 200KB
          </button>
        </div>
      </div>

      {/* Main Side-by-Side Split View (Pi7 Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 cols): Permanent Anchored Preview & Queue */}
        <div className="lg:col-span-5 space-y-6 sticky top-24">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-extrabold text-black text-base flex items-center justify-between">
              <span>Selected File Preview</span>
              <span className="text-xs font-normal text-slate-400">Zero re-upload required</span>
            </h2>

            <UniversalFilePreview
              files={files}
              activeFileIndex={activeIndex}
              onFilesSelected={(newFiles) => addFiles(newFiles)}
              onRemoveFile={(idx) => removeFile(idx)}
              onSelectActiveIndex={(idx) => setActiveIndex(idx)}
              label="Add or drop more files here"
            />
          </div>
        </div>

        {/* Right Column (7 cols): Interactive Tool Settings Dashboard */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {/* Tool Selector Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
            {[
              { id: 'resizer', label: '📏 Resize & Format' },
              { id: 'compressor', label: '🗜️ Compress Size' },
              { id: 'ocr', label: '🔍 OCR Text Extract' },
              { id: 'watermark', label: '🧹 Clean Watermark' },
              { id: 'bg', label: '🎨 BG Swap' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!activeFile ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <span className="text-4xl">📥</span>
              <p className="font-bold text-slate-600 text-sm">No file selected in memory.</p>
              <p className="text-xs">Use the dropzone on the left to load a file instantly.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* TAB 1: RESIZER & FORMAT CONVERTER */}
              {activeTab === 'resizer' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-extrabold text-black text-lg">Image Resizer & Format Converter</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Target specific width/height dimensions (px, cm, mm, in), scale by percentage, or convert file formats.
                    </p>
                  </div>

                  {/* Mode selector: Dimensions vs Percentage */}
                  <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                      onClick={() => setResizeMode('dimensions')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        resizeMode === 'dimensions' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Dimensions (Custom Unit)
                    </button>
                    <button
                      onClick={() => setResizeMode('percentage')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        resizeMode === 'percentage' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Scale by Percentage (%)
                    </button>
                  </div>

                  {resizeMode === 'dimensions' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold block mb-1">UNIT</label>
                          <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 text-black text-xs font-bold rounded-xl px-3 py-2 w-full focus:outline-none focus:border-blue-600 cursor-pointer"
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
                              className="bg-slate-50 border border-slate-200 text-black text-xs font-bold rounded-xl px-3 py-2 w-full focus:outline-none focus:border-blue-600 cursor-pointer"
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

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-black uppercase mb-1">
                            Width ({unit.toUpperCase()})
                          </label>
                          <input
                            type="number"
                            step={unit === 'px' ? '1' : '0.1'}
                            value={width}
                            onChange={(e) => handleWidthChange(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-black text-sm font-bold focus:outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-black uppercase mb-1">
                            Height ({unit.toUpperCase()})
                          </label>
                          <input
                            type="number"
                            step={unit === 'px' ? '1' : '0.1'}
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-black text-sm font-bold focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>

                      {unit !== 'px' && (
                        <p className="text-[10px] text-blue-600 font-semibold">
                          Calculated resolution: {getPixelVal(width, unit, dpi)}×{getPixelVal(height, unit, dpi)} px @ {dpi} DPI
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-xs font-bold text-black uppercase">Percentage Scale Ratio (%)</label>
                      <div className="flex gap-3 items-center">
                        <input
                          type="number"
                          value={percentScale}
                          onChange={(e) => setPercentScale(e.target.value)}
                          className="bg-white border border-slate-200 text-black font-black text-lg rounded-xl p-3 w-32 focus:outline-none focus:border-blue-600"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {['25', '50', '75', '125', '150', '200'].map((pct) => (
                            <button
                              key={pct}
                              onClick={() => setPercentScale(pct)}
                              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="flex items-center gap-2 text-xs font-bold text-black cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lockRatio}
                        onChange={(e) => setLockRatio(e.target.checked)}
                        className="rounded text-blue-600 cursor-pointer"
                      />
                      Lock Aspect Ratio
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Target Format:</span>
                      <select
                        value={imgFormat}
                        onChange={(e) => setImgFormat(e.target.value)}
                        className="bg-white border border-slate-200 text-black text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
                      >
                        <option value="png">PNG</option>
                        <option value="jpg">JPG</option>
                        <option value="webp">WEBP</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleResizeAndDownload}
                    disabled={isProcessing}
                    className="w-full bg-slate-900 hover:bg-black text-white text-xs font-bold py-4 rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isProcessing ? '⚡ Processing Canvas...' : '↓ Resize & Instant Download'}
                  </button>
                </div>
              )}

              {/* TAB 2: COMPRESSOR */}
              {activeTab === 'compressor' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-extrabold text-black text-lg">Target KB File Size Compressor</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Compress file weight under target KB (e.g. 100KB, 200KB for official forms).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-black uppercase">Target Size (KB)</label>
                    <input
                      type="number"
                      value={targetKb}
                      onChange={(e) => setTargetKb(e.target.value)}
                      placeholder="e.g. 200"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-black text-lg font-black focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <button
                    onClick={handleCompressAndDownload}
                    disabled={isProcessing}
                    className="w-full bg-slate-900 hover:bg-black text-white text-xs font-bold py-4 rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isProcessing ? '⚡ Compressing...' : `↓ Compress under ${targetKb} KB & Download`}
                  </button>
                </div>
              )}

              {/* TAB 3: OCR EXTRACTOR */}
              {activeTab === 'ocr' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-extrabold text-black text-lg">Image-to-Text OCR Scanner</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Extract text content client-side using Tesseract.js.
                    </p>
                  </div>

                  <button
                    onClick={handleRunOcr}
                    disabled={ocrLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3.5 rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {ocrLoading ? '🔍 Scanning Image (Tesseract.js)...' : '📷 Run OCR Text Scan'}
                  </button>

                  {ocrText && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-black uppercase">Extracted Text:</label>
                        <button
                          onClick={() => navigator.clipboard.writeText(ocrText)}
                          className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          📋 Copy to Clipboard
                        </button>
                      </div>
                      <textarea
                        rows={8}
                        readOnly
                        value={ocrText}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-black text-xs font-mono focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: WATERMARK REMOVER */}
              {activeTab === 'watermark' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-extrabold text-black text-lg">Watermark Cleaning Tool</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Access specialized watermark removing tool with adaptive selection overlay.
                    </p>
                  </div>
                  <Link
                    href="/tools/pdf-watermark"
                    className="inline-block bg-slate-900 hover:bg-black text-white text-xs font-bold px-6 py-3.5 rounded-2xl transition-all shadow-md"
                  >
                    Open Watermark Removal Suite ➔
                  </Link>
                </div>
              )}

              {/* TAB 5: BG CHANGER */}
              {activeTab === 'bg' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-extrabold text-black text-lg">Background Removal & Solid Color Swap</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Isolate foreground subject and swap backgrounds globally.
                    </p>
                  </div>
                  <Link
                    href="/tools/bg-changer"
                    className="inline-block bg-slate-900 hover:bg-black text-white text-xs font-bold px-6 py-3.5 rounded-2xl transition-all shadow-md"
                  >
                    Open Photo Background Editor ➔
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
