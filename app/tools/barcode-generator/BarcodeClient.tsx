'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { addHistoryItem } from '@/lib/historyStore';

export default function BarcodeClient() {
  const [barcodeText, setBarcodeText] = useState('PAPERLESS-123456');
  const [barcodeFormat, setBarcodeFormat] = useState<'CODE128' | 'EAN13' | 'UPCA'>('CODE128');
  const [barWidth, setBarWidth] = useState(2);
  const [barHeight, setBarHeight] = useState(100);
  const [displayValue, setDisplayValue] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Native Code128 Auto Encoder algorithm for HTML5 Canvas
  const renderCode128 = (text: string, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Code128B character pattern mapping (table 128)
    const code128Patterns: { [key: number]: string } = {
      0: "212222", 1: "222122", 2: "222221", 3: "121223", 4: "121322", 5: "131222", 6: "122213", 7: "122312", 8: "132212", 9: "221213",
      10: "221312", 11: "231212", 12: "112232", 13: "122132", 14: "122231", 15: "113222", 16: "123122", 17: "123221", 18: "223211", 19: "221132",
      20: "221231", 21: "213212", 22: "223112", 23: "312131", 24: "311222", 25: "321122", 26: "321221", 27: "312212", 28: "322112", 29: "322211",
      30: "212123", 31: "212321", 32: "232121", 33: "111323", 34: "131123", 35: "131321", 36: "112313", 37: "132113", 38: "132311", 39: "211313",
      40: "231113", 41: "231311", 42: "112133", 43: "112331", 44: "132131", 45: "113123", 46: "113321", 47: "133121", 48: "313121", 49: "211331",
      50: "231131", 51: "213113", 52: "213311", 53: "213131", 54: "311123", 55: "311321", 56: "331121", 57: "312113", 58: "312311", 59: "332111",
      60: "314111", 61: "221411", 62: "431111", 63: "111224", 64: "111422", 65: "121124", 66: "121421", 67: "141122", 68: "141221", 69: "112214",
      70: "112412", 71: "122114", 72: "122411", 73: "142112", 74: "142411", 75: "142121", 76: "142211", 77: "134111", 78: "111242", 79: "121142",
      80: "121241", 81: "114212", 82: "124112", 83: "124211", 84: "411212", 85: "421112", 86: "421211", 87: "212141", 88: "214121", 89: "412121",
      90: "111143", 91: "111341", 92: "131141", 93: "114113", 94: "114311", 95: "411113", 96: "411311", 97: "113141", 98: "114131", 99: "311141",
      100: "411131", 101: "211412", 102: "211214", 103: "211232", 104: "2331112" // Start B, Stop
    };

    // Build Code128 value sequence
    const values: number[] = [104]; // Start Code B
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i) - 32;
      if (code >= 0 && code <= 95) {
        values.push(code);
      }
    }

    // Calculate Checksum
    let checksum = values[0];
    for (let i = 1; i < values.length; i++) {
      checksum += values[i] * i;
    }
    checksum = checksum % 103;
    values.push(checksum);

    // Stop symbol index 104 in array map represents Code128 Stop (pattern 2331112)
    const encodedString = values.map(v => code128Patterns[v] || code128Patterns[0]).join('') + "2331112";

    // Calculate total width & height
    const quietZone = 20;
    let totalModules = 0;
    for (let char of encodedString) totalModules += parseInt(char);
    
    const calculatedWidth = totalModules * barWidth + quietZone * 2;
    const textHeight = displayValue ? 30 : 0;
    const calculatedHeight = barHeight + textHeight + quietZone * 2;

    canvas.width = calculatedWidth;
    canvas.height = calculatedHeight;

    // Fill background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw barcode modules
    let currentX = quietZone;
    ctx.fillStyle = '#000000';

    for (let i = 0; i < encodedString.length; i++) {
      const widthMultiplier = parseInt(encodedString[i]);
      const isBar = i % 2 === 0;
      const moduleWidth = widthMultiplier * barWidth;

      if (isBar) {
        ctx.fillRect(currentX, quietZone, moduleWidth, barHeight);
      }
      currentX += moduleWidth;
    }

    // Draw text label below barcode if enabled
    if (displayValue) {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(text, calculatedWidth / 2, barHeight + quietZone + 22);
    }

    const dataUrl = canvas.toDataURL('image/png');
    setDownloadUrl(dataUrl);
  };

  useEffect(() => {
    if (canvasRef.current && barcodeText.trim()) {
      renderCode128(barcodeText.trim(), canvasRef.current);
    }
  }, [barcodeText, barWidth, barHeight, displayValue]);

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `barcode-${barcodeText.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addHistoryItem({
      filename: `barcode-${barcodeText}.png`,
      toolName: 'Barcode Generator',
      downloadUrl,
      fileSizeText: 'High-Res PNG Barcode',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Title Header */}
      <div>
        <Link href="/" className="text-blue-600 font-bold hover:underline text-xs block text-left mb-2 w-fit">
          ← Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-black">Barcode Generator</h1>
        <p className="text-slate-600 text-sm mt-1">Generate high-resolution Code128 barcodes instantly in your browser. 100% free with PNG download.</p>
      </div>

      {/* Main Container: Controls STRICTLY ABOVE Preview */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        
        {/* SECTION 1: ALL CONTROLS STRICTLY ABOVE THE BARCODE PREVIEW */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-black">Enter Text or Code Number</label>
            <input
              type="text"
              value={barcodeText}
              onChange={(e) => setBarcodeText(e.target.value)}
              placeholder="e.g. PRODUCT-123456"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-black text-base font-bold font-mono focus:outline-none focus:border-blue-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bar Scale Width</label>
              <select
                value={barWidth}
                onChange={(e) => setBarWidth(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 text-black text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value={1}>1px (Compact)</option>
                <option value={2}>2px (Standard)</option>
                <option value={3}>3px (Large)</option>
                <option value={4}>4px (Extra HD)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bar Height (px)</label>
              <select
                value={barHeight}
                onChange={(e) => setBarHeight(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 text-black text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value={60}>60px (Slim)</option>
                <option value={100}>100px (Standard)</option>
                <option value={140}>140px (Tall)</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 text-xs font-bold text-black cursor-pointer mt-4 sm:mt-0">
                <input
                  type="checkbox"
                  checked={displayValue}
                  onChange={(e) => setDisplayValue(e.target.checked)}
                  className="rounded text-blue-600 cursor-pointer w-4 h-4"
                />
                Show Human Text Label
              </label>
            </div>
          </div>

          {/* Download Action Button ABOVE preview */}
          <button
            onClick={handleDownload}
            disabled={!downloadUrl || !barcodeText.trim()}
            className="w-full bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold py-4 rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            ↓ Download High-Res Barcode (.png)
          </button>
        </div>

        {/* SECTION 2: LIVE CANVAS PREVIEW RENDERED BELOW CONTROLS */}
        <div className="pt-6 border-t border-slate-100 flex flex-col items-center space-y-4">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Live Rendered Barcode Preview</p>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md max-w-full overflow-x-auto">
            <canvas ref={canvasRef} className="max-w-full h-auto block" />
          </div>
        </div>

      </div>

      {/* SECTION 3: RICH SEO CONTENT & GUIDE */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 text-slate-700 leading-relaxed">
        <h2 className="text-2xl font-black text-black">Free Client-Side Barcode Generator Online</h2>
        <p>
          Create instant, high-density Code128 barcodes directly in your browser. Paperless provides a 100% free, private barcode rendering engine that requires zero software installation or server uploads.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-black text-sm mb-1">⚡ Instant Code128 Render</h3>
            <p className="text-xs text-slate-500">Supports alphanumeric strings, product SKUs, serial numbers, and shipping tracking codes.</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-black text-sm mb-1">🔒 100% Client-Side Privacy</h3>
            <p className="text-xs text-slate-500">Your codes and product data remain completely local on your device.</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-black text-sm mb-1">📥 Crisp PNG Export</h3>
            <p className="text-xs text-slate-500">Download crystal-clear PNG images ready for print stickers, labels, and inventory tags.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
