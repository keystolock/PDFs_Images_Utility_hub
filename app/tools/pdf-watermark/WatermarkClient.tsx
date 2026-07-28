'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { addHistoryItem } from '@/lib/historyStore';

interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

export default function WatermarkClient() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cleanedPreviewUrl, setCleanedPreviewUrl] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pdfDocRef = useRef<any>(null);

  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Interactive Selection Box Overlay (percentage 0-100)
  const [selection, setSelection] = useState<SelectionBox>({ x: 25, y: 40, width: 50, height: 15 });
  const [dragMode, setDragMode] = useState<DragMode>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, startSel: { x: 25, y: 40, width: 50, height: 15 } });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderPdfPage = async (pdfDoc: any, pageNum: number) => {
    setIsProcessing(true);
    setPreviewUrl(null);
    setCleanedPreviewUrl(null);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      setPreviewUrl(canvas.toDataURL('image/jpeg', 0.95));
    } catch (err) {
      console.error(err);
      alert('Failed to render PDF page.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setCleanedPreviewUrl(null);
      setSelection({ x: 25, y: 40, width: 50, height: 15 });

      if (selected.type === 'application/pdf') {
        setFileType('pdf');
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
          const arrayBuffer = await selected.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          pdfDocRef.current = pdfDoc;
          setTotalPages(pdfDoc.numPages);
          setCurrentPage(1);

          await renderPdfPage(pdfDoc, 1);
        } catch (err) {
          console.error(err);
          alert('Error reading PDF.');
          setIsProcessing(false);
        }
      } else if (selected.type.startsWith('image/')) {
        setFileType('image');
        setTotalPages(1);
        setCurrentPage(1);
        setPreviewUrl(URL.createObjectURL(selected));
      }
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileType(null);
    setPreviewUrl(null);
    setCleanedPreviewUrl(null);
  };

  // Interactive Touch & Mouse Drag Handlers
  const startDrag = (clientX: number, clientY: number, mode: DragMode) => {
    setDragMode(mode);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startSel: { ...selection },
    };
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!dragMode || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaY = ((clientY - dragStartRef.current.y) / rect.height) * 100;
      const start = dragStartRef.current.startSel;

      setSelection(() => {
        let { x, y, width, height } = start;

        if (dragMode === 'move') {
          x = Math.max(0, Math.min(100 - width, start.x + deltaX));
          y = Math.max(0, Math.min(100 - height, start.y + deltaY));
        } else if (dragMode === 'se') {
          width = Math.max(5, Math.min(100 - x, start.width + deltaX));
          height = Math.max(5, Math.min(100 - y, start.height + deltaY));
        } else if (dragMode === 'nw') {
          const newX = Math.max(0, Math.min(start.x + start.width - 5, start.x + deltaX));
          const newY = Math.max(0, Math.min(start.y + start.height - 5, start.y + deltaY));
          width = start.x + start.width - newX;
          height = start.y + start.height - newY;
          x = newX;
          y = newY;
        }

        return { x, y, width, height };
      });
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
  }, [dragMode]);

  // Decoupled Process Watermark Removal
  const handleApplyCleanMask = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      if (fileType === 'pdf') {
        if (!(window as any).PDFLib) {
          await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
            script.onload = resolve;
            document.body.appendChild(script);
          });
        }

        const { PDFDocument, rgb } = (window as any).PDFLib;
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();

        pages.forEach((page: any) => {
          const { width, height } = page.getSize();
          const rectX = width * (selection.x / 100);
          const rectY = height * (1 - (selection.y + selection.height) / 100);
          const rectW = width * (selection.width / 100);
          const rectH = height * (selection.height / 100);

          page.drawRectangle({
            x: rectX,
            y: rectY,
            width: rectW,
            height: rectH,
            color: rgb(1, 1, 1),
            opacity: 1.0,
          });
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const cleanUrl = URL.createObjectURL(blob);
        setCleanedPreviewUrl(cleanUrl);
      } else if (fileType === 'image' && previewUrl) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = previewUrl;
        await new Promise((res) => (img.onload = res));

        canvas.width = img.width;
        canvas.height = img.height;
        if (ctx) {
          ctx.drawImage(img, 0, 0);

          const stripX = img.width * (selection.x / 100);
          const stripY = img.height * (selection.y / 100);
          const stripW = img.width * (selection.width / 100);
          const stripH = img.height * (selection.height / 100);

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(stripX, stripY, stripW, stripH);

          canvas.toBlob((blob) => {
            if (blob) {
              const cleanUrl = URL.createObjectURL(blob);
              setCleanedPreviewUrl(cleanUrl);
            }
          }, file.type);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error erasing watermark.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Action (downloads ONLY when user clicks!)
  const handleDownload = () => {
    if (!cleanedPreviewUrl || !file) return;
    const a = document.createElement('a');
    a.href = cleanedPreviewUrl;
    a.download = `cleaned_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addHistoryItem({
      filename: `cleaned_${file.name}`,
      toolName: 'Watermark Remover',
      downloadUrl: cleanedPreviewUrl,
      fileSizeText: 'Cleaned Document',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Title Header */}
      <div className="text-center space-y-1">
        <Link href="/" className="text-blue-600 font-semibold hover:underline text-xs inline-block mb-1">
          ← Back to Home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-black">Precision Watermark Remover</h1>
        <p className="text-slate-500 text-xs">Drag red target box directly on screen to erase watermarks and stamps.</p>
      </div>

      <input ref={fileInputRef} type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="hidden" />

      {/* DROP / SELECT CONTAINER */}
      {!file && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-white p-10 rounded-3xl border-2 border-dashed border-blue-400 text-center shadow-sm cursor-pointer hover:bg-slate-50 transition-all space-y-3 max-w-lg mx-auto"
        >
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-xs">
            🧹
          </div>
          <p className="font-extrabold text-base text-black">Click or Drag & Drop PDF / Image to Clean</p>
          <p className="text-xs text-slate-400 font-medium">Supports PDF, PNG, JPG, WEBP • 100% Private</p>
        </div>
      )}

      {/* CANVA / REMOVE.BG STYLE WORKSPACE */}
      {file && previewUrl && (
        <div className="space-y-6">
          
          {/* TOP TOOLBAR RIBBON WITH BLUE DOWNLOAD BUTTON */}
          <div className="bg-white p-2.5 rounded-full border border-slate-200 shadow-md flex items-center justify-between gap-2 max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyCleanMask}
                disabled={isProcessing}
                className="bg-slate-900 hover:bg-black text-white font-bold text-xs px-4 py-2 rounded-full transition-all cursor-pointer shadow-xs"
              >
                {isProcessing ? 'Erasing...' : '✨ Apply Clean Mask'}
              </button>

              <button
                onMouseDown={() => setIsHoldingOriginal(true)}
                onMouseUp={() => setIsHoldingOriginal(false)}
                onMouseLeave={() => setIsHoldingOriginal(false)}
                onTouchStart={() => setIsHoldingOriginal(true)}
                onTouchEnd={() => setIsHoldingOriginal(false)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2 rounded-full transition-all cursor-pointer select-none touch-none"
              >
                👁️ Hold Original
              </button>
            </div>

            {/* DOWNLOAD BUTTON */}
            <button
              onClick={handleDownload}
              disabled={!cleanedPreviewUrl}
              className={`font-extrabold text-xs sm:text-sm px-6 py-2 rounded-full transition-all shadow-md flex items-center gap-1 cursor-pointer ${
                cleanedPreviewUrl ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Download</span>
              <span className="text-xs">∨</span>
            </button>
          </div>

          {/* CENTER INTERACTIVE PREVIEW CANVAS WITH TOUCH-DRAG BOX OVERLAY */}
          <div className="flex justify-center">
            <div
              ref={containerRef}
              className="relative inline-block overflow-hidden rounded-3xl border border-slate-300 bg-slate-100 max-w-full shadow-xl select-none touch-none"
            >
              <img
                src={isHoldingOriginal ? previewUrl : (cleanedPreviewUrl || previewUrl)}
                alt="Watermark Clean Preview"
                className="max-h-[480px] w-auto block mx-auto pointer-events-none rounded-2xl"
              />

              {/* INTERACTIVE DRAG & TOUCH SELECTION BOX OVERLAY */}
              {!isHoldingOriginal && !cleanedPreviewUrl && (
                <div
                  onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY, 'move'); }}
                  onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY, 'move')}
                  className="absolute border-2 border-dashed border-red-500 bg-red-500/20 shadow-lg cursor-move touch-none"
                  style={{
                    top: `${selection.y}%`,
                    left: `${selection.x}%`,
                    width: `${selection.width}%`,
                    height: `${selection.height}%`,
                  }}
                >
                  <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded absolute -top-5 left-0 shadow pointer-events-none whitespace-nowrap">
                    💡 Drag to position watermark mask
                  </span>

                  {/* Corner Drag Handles */}
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e.clientX, e.clientY, 'nw'); }}
                    onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientX, e.touches[0].clientY, 'nw'); }}
                    className="absolute -top-3 -left-3 w-6 h-6 bg-white border-2 border-red-600 rounded-full cursor-nw-resize shadow-md"
                  />
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e.clientX, e.clientY, 'se'); }}
                    onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientX, e.touches[0].clientY, 'se'); }}
                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-red-600 rounded-full cursor-se-resize shadow-md"
                  />
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM TRAY WITH + BUTTON AND FILE PILL */}
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
                title="Remove document"
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
