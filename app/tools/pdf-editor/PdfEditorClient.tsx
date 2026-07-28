'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { addHistoryItem } from '@/lib/historyStore';

interface MaskBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragMode = 'move' | 'nw' | 'se' | null;

export default function PdfEditorClient() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  
  // Working Document Byte State
  const [workingPdfBytes, setWorkingPdfBytes] = useState<Uint8Array | null>(null);
  const [workingImageUrl, setWorkingImageUrl] = useState<string | null>(null);
  
  // Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pdfDocRef = useRef<any>(null);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);

  // Active Tool Mode
  const [activeTool, setActiveTool] = useState<'move' | 'eraser' | 'addText' | 'highlight' | 'signature'>('addText');

  // Tool Specific States
  const [maskColor, setMaskColor] = useState<string>('#FFFFFF');
  const [eraseMask, setEraseMask] = useState<MaskBox>({ x: 20, y: 30, width: 40, height: 10 });

  // Add Text State
  const [textPos, setTextPos] = useState<MaskBox>({ x: 25, y: 25, width: 45, height: 12 });
  const [textString, setTextString] = useState<string>('Type your text here...');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [fontSize, setFontSize] = useState<number>(20);
  const [fontFamily, setFontFamily] = useState<string>('Helvetica');

  // Highlight State
  const [highlightBox, setHighlightBox] = useState<MaskBox>({ x: 25, y: 50, width: 45, height: 8 });

  // Signature Tool
  const [sigTab, setSigTab] = useState<'draw' | 'upload'>('draw');
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [stampPosition, setStampPosition] = useState<MaskBox>({ x: 30, y: 30, width: 25, height: 12 });
  const [isDrawingSig, setIsDrawingSig] = useState<boolean>(false);

  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, startBox: { x: 25, y: 25, width: 45, height: 12 } });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // Digital Signature Canvas Handlers
  const startSigDraw = (clientX: number, clientY: number) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawingSig(true);
  };

  const drawSig = (clientX: number, clientY: number) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = textColor;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopSigDraw = () => setIsDrawingSig(false);

  const clearSigCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const applyDrawnSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    setStampPreview(canvas.toDataURL('image/png'));
  };

  // Render PDF Page onto previewUrl cleanly
  const renderPdfBytesPage = async (pdfBytes: Uint8Array, pageNum: number) => {
    setIsProcessing(true);
    try {
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
      const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
      pdfDocRef.current = pdfDoc;
      setTotalPages(pdfDoc.numPages);

      if (pdfDoc.numPages > 1) {
        setShowThumbnails(true);
      }

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewUrl(dataUrl);
    } catch (err) {
      console.error('PDF Page Render Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);

      if (selected.type === 'application/pdf') {
        setFileType('pdf');
        setIsProcessing(true);
        try {
          const arrayBuffer = await selected.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          setWorkingPdfBytes(bytes);
          setCurrentPage(1);

          await renderPdfBytesPage(bytes, 1);
        } catch (err) {
          console.error(err);
          alert('Failed to load PDF.');
          setIsProcessing(false);
        }
      } else if (selected.type.startsWith('image/')) {
        setFileType('image');
        setTotalPages(1);
        setCurrentPage(1);
        setShowThumbnails(false);
        const url = URL.createObjectURL(selected);
        setWorkingImageUrl(url);
        setPreviewUrl(url);
      }
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setStampPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && workingPdfBytes) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      renderPdfBytesPage(workingPdfBytes, newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && workingPdfBytes) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      renderPdfBytesPage(workingPdfBytes, newPage);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileType(null);
    setWorkingPdfBytes(null);
    setWorkingImageUrl(null);
    setPreviewUrl(null);
    setStampPreview(null);
  };

  // Interactive Touch & Mouse Drag + Resize Handlers
  const startDrag = (clientX: number, clientY: number, mode: DragMode) => {
    setDragMode(mode);
    let activeBox = eraseMask;
    if (activeTool === 'highlight') activeBox = highlightBox;
    else if (activeTool === 'addText') activeBox = textPos;
    else if (activeTool === 'signature') activeBox = stampPosition;

    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startBox: { ...activeBox },
    };
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!dragMode || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaY = ((clientY - dragStartRef.current.y) / rect.height) * 100;
      const start = dragStartRef.current.startBox;

      const updateBox = () => {
        let { x, y, width, height } = start;
        if (dragMode === 'move') {
          x = Math.max(0, Math.min(100 - width, start.x + deltaX));
          y = Math.max(0, Math.min(100 - height, start.y + deltaY));
        } else if (dragMode === 'se') {
          width = Math.max(8, Math.min(100 - x, start.width + deltaX));
          height = Math.max(4, Math.min(100 - y, start.height + deltaY));
        }
        return { x, y, width, height };
      };

      if (activeTool === 'eraser') setEraseMask(updateBox());
      else if (activeTool === 'highlight') setHighlightBox(updateBox());
      else if (activeTool === 'addText') setTextPos(updateBox());
      else if (activeTool === 'signature') setStampPosition(updateBox());
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onEnd = () => setDragMode(null);

    if (dragMode) {
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
  }, [dragMode, activeTool]);

  // CUMULATIVE EDITS: Bake changes into working state and update preview!
  const handleApplyEdits = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      if (fileType === 'pdf' && workingPdfBytes) {
        if (!(window as any).PDFLib) {
          await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
            script.onload = resolve;
            document.body.appendChild(script);
          });
        }

        const { PDFDocument, rgb, StandardFonts } = (window as any).PDFLib;
        const pdfDoc = await PDFDocument.load(workingPdfBytes.slice(0));
        const pages = pdfDoc.getPages();
        const targetPage = pages[currentPage - 1];
        const { width, height } = targetPage.getSize();

        // 1. Eraser Mask
        if (activeTool === 'eraser') {
          const rectX = width * (eraseMask.x / 100);
          const rectY = height * (1 - (eraseMask.y + eraseMask.height) / 100);
          const rectW = width * (eraseMask.width / 100);
          const rectH = height * (eraseMask.height / 100);

          const hex = maskColor.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;

          targetPage.drawRectangle({
            x: rectX,
            y: rectY,
            width: rectW,
            height: rectH,
            color: rgb(r, g, b),
            opacity: 1.0,
          });
        }

        // 2. Highlight Box
        if (activeTool === 'highlight') {
          const rectX = width * (highlightBox.x / 100);
          const rectY = height * (1 - (highlightBox.y + highlightBox.height) / 100);
          const rectW = width * (highlightBox.width / 100);
          const rectH = height * (highlightBox.height / 100);

          targetPage.drawRectangle({
            x: rectX,
            y: rectY,
            width: rectW,
            height: rectH,
            color: rgb(1, 0.95, 0.4),
            opacity: 0.4,
          });
        }

        // 3. Signature Stamp
        if (activeTool === 'signature' && stampPreview) {
          const res = await fetch(stampPreview);
          const stampBytes = await res.arrayBuffer();
          const embeddedImage = await pdfDoc.embedPng(stampBytes);

          const stampX = width * (stampPosition.x / 100);
          const stampY = height * (1 - (stampPosition.y + stampPosition.height) / 100);
          const stampW = width * (stampPosition.width / 100);
          const stampH = height * (stampPosition.height / 100);

          targetPage.drawImage(embeddedImage, {
            x: stampX,
            y: stampY,
            width: stampW,
            height: stampH,
          });
        }

        // 4. Add Text Box with Custom Font Family & Wrapping
        if (activeTool === 'addText' && textString.trim()) {
          const annX = width * (textPos.x / 100);
          const annY = height * (1 - (textPos.y + textPos.height) / 100);

          const hex = textColor.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;

          // Embed Standard Font
          let selectedFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
          if (fontFamily === 'Times-Roman') selectedFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
          else if (fontFamily === 'Courier') selectedFont = await pdfDoc.embedFont(StandardFonts.Courier);

          targetPage.drawText(textString.trim(), {
            x: annX,
            y: annY + 2, // Minor top offset matching standard padding
            size: fontSize,
            font: selectedFont,
            color: rgb(r, g, b),
          });
        }

        const updatedPdfBytes = await pdfDoc.save();
        setWorkingPdfBytes(updatedPdfBytes);
        await renderPdfBytesPage(updatedPdfBytes, currentPage);
      } else if (fileType === 'image' && workingImageUrl) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = workingImageUrl;
        await new Promise((res) => (img.onload = res));

        canvas.width = img.width;
        canvas.height = img.height;

        if (ctx) {
          ctx.drawImage(img, 0, 0);

          if (activeTool === 'eraser') {
            const maskX = img.width * (eraseMask.x / 100);
            const maskY = img.height * (eraseMask.y / 100);
            const maskW = img.width * (eraseMask.width / 100);
            const maskH = img.height * (eraseMask.height / 100);

            ctx.fillStyle = maskColor;
            ctx.fillRect(maskX, maskY, maskW, maskH);
          }

          if (activeTool === 'highlight') {
            const hX = img.width * (highlightBox.x / 100);
            const hY = img.height * (highlightBox.y / 100);
            const hW = img.width * (highlightBox.width / 100);
            const hH = img.height * (highlightBox.height / 100);

            ctx.fillStyle = 'rgba(254, 240, 138, 0.5)';
            ctx.fillRect(hX, hY, hW, hH);
          }

          if (activeTool === 'signature' && stampPreview) {
            const stampImg = new Image();
            stampImg.src = stampPreview;
            await new Promise((res) => (stampImg.onload = res));

            const sX = img.width * (stampPosition.x / 100);
            const sY = img.height * (stampPosition.y / 100);
            const sW = img.width * (stampPosition.width / 100);
            const sH = img.height * (stampPosition.height / 100);

            ctx.drawImage(stampImg, sX, sY, sW, sH);
          }

          if (activeTool === 'addText' && textString.trim()) {
            ctx.fillStyle = textColor;
            ctx.font = `${fontSize * 1.5}px ${fontFamily}, sans-serif`;
            ctx.fillText(textString, img.width * (textPos.x / 100), img.height * (textPos.y / 100));
          }

          canvas.toBlob((blob) => {
            if (blob) {
              const newUrl = URL.createObjectURL(blob);
              setWorkingImageUrl(newUrl);
              setPreviewUrl(newUrl);
            }
          }, file.type);
        }
      }

      // Reset overlay input states once baked successfully
      setTextString('');
      setStampPreview(null);
      setActiveTool('move');
    } catch (err) {
      console.error(err);
      alert('Failed to apply edits.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!file) return;

    if (fileType === 'pdf' && workingPdfBytes) {
      const blob = new Blob([workingPdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      addHistoryItem({
        filename: `edited_${file.name}`,
        toolName: 'PDF & Image Editor',
        downloadUrl: url,
        fileSizeText: 'Cumulative Edited PDF',
      });
    } else if (fileType === 'image' && workingImageUrl) {
      const a = document.createElement('a');
      a.href = workingImageUrl;
      a.download = `edited_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      addHistoryItem({
        filename: `edited_${file.name}`,
        toolName: 'PDF & Image Editor',
        downloadUrl: workingImageUrl,
        fileSizeText: 'Edited Image',
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-4">
        <div>
          <Link href="/" className="text-blue-600 font-bold hover:underline text-xs inline-block mb-1">
            ← Back to Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-black">PDF Document Editor</h1>
          <p className="text-slate-500 text-xs mt-0.5">Interactive text resizer, font picker, eraser & digital signature pad.</p>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="hidden" />
      <input ref={stampInputRef} type="file" accept="image/*" onChange={handleStampUpload} className="hidden" />

      {/* INITIAL FILE DROP CONTAINER */}
      {!file && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-white p-12 rounded-3xl border-2 border-dashed border-blue-400 text-center shadow-sm cursor-pointer hover:bg-slate-50 transition-all space-y-3 max-w-lg mx-auto"
        >
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-xs">
            📝
          </div>
          <p className="font-extrabold text-base text-black">Click or Drag & Drop PDF / Image File</p>
          <p className="text-xs text-slate-400 font-medium">Supports PDF, PNG, JPG, WEBP • Cumulative Edits</p>
        </div>
      )}

      {/* IMAGE 3 STYLE RIBBON & DOCUMENT WORKSPACE */}
      {file && previewUrl && (
        <div className="space-y-6">
          
          {/* IMAGE 3 TOP RIBBON TOOLBAR */}
          <div className="bg-white px-6 py-2.5 rounded-full border border-slate-200 shadow-md flex items-center justify-between gap-4 max-w-4xl mx-auto overflow-x-auto">
            <div className="flex items-center gap-2 py-1">
              <button
                onClick={() => setShowThumbnails(!showThumbnails)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  showThumbnails ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                📖 Pages
              </button>

              {fileType === 'pdf' && totalPages > 1 && (
                <div className="flex items-center gap-1.5 ml-1">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || isProcessing}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50"
                  >
                    ←
                  </button>
                  <span className="text-xs font-bold text-black px-1">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || isProcessing}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50"
                  >
                    →
                  </button>
                </div>
              )}

              <button
                onClick={() => setActiveTool('move')}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTool === 'move' ? 'bg-slate-100 text-slate-900 shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                ✋ Move
              </button>

              <button
                onClick={() => setActiveTool('eraser')}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTool === 'eraser' ? 'bg-slate-100 text-slate-900 shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                🖌️ Eraser
              </button>

              <button
                onClick={() => setActiveTool('highlight')}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTool === 'highlight' ? 'bg-slate-100 text-slate-900 shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                🖍️ Highlight
              </button>

              <button
                onClick={() => setActiveTool('addText')}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTool === 'addText' ? 'bg-slate-100 text-slate-900 shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                T Add Text
              </button>

              <button
                onClick={() => setActiveTool('signature')}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTool === 'signature' ? 'bg-slate-100 text-slate-900 shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                ✍️ Signature
              </button>

              <button
                onClick={handleApplyEdits}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-5 py-2 rounded-full transition-all shadow-xs cursor-pointer ml-1"
              >
                {isProcessing ? 'Baking...' : '✓ Done'}
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

            <button
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 rounded-full transition-all shadow-md cursor-pointer whitespace-nowrap"
            >
              Download ∨
            </button>
          </div>

          {/* ACTIVE TOOL CONTROLS */}
          {activeTool === 'addText' && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={textString}
                  onChange={(e) => setTextString(e.target.value)}
                  placeholder="Enter text to place..."
                  className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-black focus:outline-none flex-1 w-full"
                />

                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none cursor-pointer"
                >
                  <option value="Helvetica">Inter / Sans-Serif</option>
                  <option value="Arial">Arial</option>
                  <option value="Times-Roman">Times New Roman</option>
                  <option value="Courier">Courier Monospace</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Impact">Impact</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-600 pt-1 gap-2">
                <span>Font Size: {fontSize}px</span>
                <input
                  type="range"
                  min={12}
                  max={60}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-36 cursor-pointer"
                />
                <div className="flex items-center gap-2">
                  <span>Color:</span>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer p-0 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTool === 'signature' && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 max-w-md mx-auto text-center">
              <div className="flex justify-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setSigTab('draw')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    sigTab === 'draw' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  🖌️ Digital Draw
                </button>
                <button
                  onClick={() => setSigTab('upload')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    sigTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  📁 Upload Image
                </button>
              </div>

              {sigTab === 'draw' ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500 font-medium">Draw signature below using finger or mouse:</p>
                  <canvas
                    ref={sigCanvasRef}
                    width={320}
                    height={120}
                    onMouseDown={(e) => startSigDraw(e.clientX, e.clientY)}
                    onMouseMove={(e) => drawSig(e.clientX, e.clientY)}
                    onMouseUp={stopSigDraw}
                    onMouseLeave={stopSigDraw}
                    onTouchStart={(e) => startSigDraw(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchMove={(e) => drawSig(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchEnd={stopSigDraw}
                    className="bg-white border border-slate-300 rounded-xl mx-auto block cursor-crosshair shadow-inner"
                  />
                  <div className="flex justify-center gap-2 pt-1">
                    <button
                      onClick={clearSigCanvas}
                      className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-lg"
                    >
                      Clear
                    </button>
                    <button
                      onClick={applyDrawnSig}
                      className="bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-lg"
                    >
                      Insert Signature
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => stampInputRef.current?.click()}
                  className="bg-blue-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs"
                >
                  Choose PNG Signature File
                </button>
              )}
            </div>
          )}

          {/* MAIN SPLIT VIEW */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {showThumbnails && fileType === 'pdf' && totalPages > 1 && (
              <div className="md:col-span-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <p className="text-xs font-extrabold text-black uppercase tracking-wider border-b border-slate-100 pb-2">
                  Pages ({totalPages})
                </p>
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => {
                        setCurrentPage(pg);
                        if (workingPdfBytes) renderPdfBytesPage(workingPdfBytes, pg);
                      }}
                      className={`w-full text-left p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                        currentPage === pg ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      📄 Page {pg}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* DOCUMENT CANVAS WITH RESIZABLE OVERLAYS */}
            <div className={`${showThumbnails && fileType === 'pdf' && totalPages > 1 ? 'md:col-span-9' : 'md:col-span-12'} flex justify-center`}>
              <div
                ref={containerRef}
                className="relative inline-block overflow-hidden rounded-3xl border border-slate-300 bg-slate-100 max-w-full shadow-xl select-none touch-none min-h-[300px]"
              >
                <img
                  src={previewUrl}
                  alt="Document Page Preview"
                  className="max-h-[540px] w-auto block mx-auto rounded-2xl border border-slate-200"
                />

                {/* ERASER MASK INTERACTIVE BOUNDS */}
                {activeTool === 'eraser' && (
                  <div
                    onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY, 'move'); }}
                    onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY, 'move')}
                    className="absolute border-2 border-dashed border-red-500 bg-white/90 shadow-lg cursor-move touch-none"
                    style={{
                      top: `${eraseMask.y}%`,
                      left: `${eraseMask.x}%`,
                      width: `${eraseMask.width}%`,
                      height: `${eraseMask.height}%`,
                    }}
                  >
                    <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded absolute -top-5 left-0 shadow pointer-events-none whitespace-nowrap">
                      Text Eraser
                    </span>
                    <div
                      onMouseDown={(e) => { e.stopPropagation(); startDrag(e.clientX, e.clientY, 'se'); }}
                      onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientX, e.touches[0].clientY, 'se'); }}
                      className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-red-600 rounded-full cursor-se-resize shadow-md"
                    />
                  </div>
                )}

                {/* DRAGGABLE + RESIZABLE TEXT BOX */}
                {activeTool === 'addText' && (
                  <div
                    onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY, 'move'); }}
                    onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY, 'move')}
                    className="absolute border-2 border-dashed border-blue-600 bg-blue-50/80 p-1.5 shadow-lg cursor-move touch-none font-bold overflow-hidden"
                    style={{
                      top: `${textPos.y}%`,
                      left: `${textPos.x}%`,
                      width: `${textPos.width}%`,
                      height: `${textPos.height}%`,
                      color: textColor,
                      fontSize: `${fontSize}px`,
                      fontFamily: fontFamily,
                    }}
                  >
                    <div className="w-full h-full leading-tight overflow-hidden break-words whitespace-pre-wrap">
                      {textString}
                    </div>

                    {/* RESIZE HANDLE FOR EXPAND / SHRINK ON DESKTOP & MOBILE TOUCH */}
                    <div
                      onMouseDown={(e) => { e.stopPropagation(); startDrag(e.clientX, e.clientY, 'se'); }}
                      onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientX, e.touches[0].clientY, 'se'); }}
                      className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full cursor-se-resize shadow-md flex items-center justify-center text-[9px] font-black text-blue-600"
                      title="Drag to resize text box"
                    >
                      ↘
                    </div>
                  </div>
                )}

                {/* HIGHLIGHT BOUNDS */}
                {activeTool === 'highlight' && (
                  <div
                    onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY, 'move'); }}
                    onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY, 'move')}
                    className="absolute border-2 border-dashed border-amber-500 bg-yellow-300/40 shadow-lg cursor-move touch-none"
                    style={{
                      top: `${highlightBox.y}%`,
                      left: `${highlightBox.x}%`,
                      width: `${highlightBox.width}%`,
                      height: `${highlightBox.height}%`,
                    }}
                  >
                    <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded absolute -top-5 left-0 shadow pointer-events-none whitespace-nowrap">
                      Highlight
                    </span>
                    <div
                      onMouseDown={(e) => { e.stopPropagation(); startDrag(e.clientX, e.clientY, 'se'); }}
                      onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientX, e.touches[0].clientY, 'se'); }}
                      className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-amber-600 rounded-full cursor-se-resize shadow-md"
                    />
                  </div>
                )}

                {/* SIGNATURE STAMP OVERLAY */}
                {activeTool === 'signature' && stampPreview && (
                  <div
                    onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY, 'move'); }}
                    onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY, 'move')}
                    className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 shadow-lg cursor-move touch-none flex items-center justify-center"
                    style={{
                      top: `${stampPosition.y}%`,
                      left: `${stampPosition.x}%`,
                      width: `${stampPosition.width}%`,
                      height: `${stampPosition.height}%`,
                    }}
                  >
                    <img src={stampPreview} alt="Signature Stamp" className="max-w-full max-h-full object-contain pointer-events-none" />
                    <div
                      onMouseDown={(e) => { e.stopPropagation(); startDrag(e.clientX, e.clientY, 'se'); }}
                      onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientX, e.touches[0].clientY, 'se'); }}
                      className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full cursor-se-resize shadow-md"
                    />
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* BOTTOM TRAY */}
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
                title="Remove file"
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
