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

type DragType = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

export default function WatermarkClient() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cleanedPreviewUrl, setCleanedPreviewUrl] = useState<string | null>(null);

  // PDF page state
  const pdfDocRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);

  // Selection Box coordinates (percentages 0 - 100)
  const [selection, setSelection] = useState<SelectionBox>({ x: 20, y: 40, width: 60, height: 15 });
  const [dragType, setDragType] = useState<DragType | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, startSel: { x: 20, y: 40, width: 60, height: 15 } });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
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

      await page.render({ canvasContext: context, viewport: viewport }).promise;
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
      setSelection({ x: 20, y: 40, width: 60, height: 15 });

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
          alert('Failed to load PDF file.');
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

  const handlePrevPage = () => {
    if (currentPage > 1 && pdfDocRef.current) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      renderPdfPage(pdfDocRef.current, newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && pdfDocRef.current) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      renderPdfPage(pdfDocRef.current, newPage);
    }
  };

  // Drag & Touch Handlers for Mouse and Mobile Devices
  const startDrag = (clientX: number, clientY: number, type: DragType) => {
    setDragType(type);
    dragStart.current = {
      x: clientX,
      y: clientY,
      startSel: { ...selection },
    };
  };

  const handleMouseDown = (e: React.MouseEvent, type: DragType) => {
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX, e.clientY, type);
  };

  const handleTouchStart = (e: React.TouchEvent, type: DragType) => {
    e.stopPropagation();
    if (e.touches.length > 0) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY, type);
    }
  };

  useEffect(() => {
    const updateDrag = (clientX: number, clientY: number) => {
      if (!dragType || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((clientX - dragStart.current.x) / rect.width) * 100;
      const deltaY = ((clientY - dragStart.current.y) / rect.height) * 100;
      const start = dragStart.current.startSel;

      setSelection(() => {
        let { x, y, width, height } = start;

        if (dragType === 'move') {
          x = Math.max(0, Math.min(100 - width, start.x + deltaX));
          y = Math.max(0, Math.min(100 - height, start.y + deltaY));
        } else if (dragType === 'se') {
          width = Math.max(3, Math.min(100 - x, start.width + deltaX));
          height = Math.max(3, Math.min(100 - y, start.height + deltaY));
        } else if (dragType === 'sw') {
          const newX = Math.max(0, Math.min(start.x + start.width - 3, start.x + deltaX));
          width = start.x + start.width - newX;
          x = newX;
          height = Math.max(3, Math.min(100 - y, start.height + deltaY));
        } else if (dragType === 'ne') {
          width = Math.max(3, Math.min(100 - x, start.width + deltaX));
          const newY = Math.max(0, Math.min(start.y + start.height - 3, start.y + deltaY));
          height = start.y + start.height - newY;
          y = newY;
        } else if (dragType === 'nw') {
          const newX = Math.max(0, Math.min(start.x + start.width - 3, start.x + deltaX));
          const newY = Math.max(0, Math.min(start.y + start.height - 3, start.y + deltaY));
          width = start.x + start.width - newX;
          height = start.y + start.height - newY;
          x = newX;
          y = newY;
        } else if (dragType === 'e') {
          width = Math.max(3, Math.min(100 - x, start.width + deltaX));
        } else if (dragType === 'w') {
          const newX = Math.max(0, Math.min(start.x + start.width - 3, start.x + deltaX));
          width = start.x + start.width - newX;
          x = newX;
        } else if (dragType === 's') {
          height = Math.max(3, Math.min(100 - y, start.height + deltaY));
        } else if (dragType === 'n') {
          const newY = Math.max(0, Math.min(start.y + start.height - 3, start.y + deltaY));
          height = start.y + start.height - newY;
          y = newY;
        }

        return { x, y, width, height };
      });
    };

    const handleMouseMove = (e: MouseEvent) => updateDrag(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateDrag(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleEnd = () => setDragType(null);

    if (dragType) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [dragType]);

  // Decoupled Action 1: Remove Watermark & Preview
  const handleRemoveWatermarkPreview = async () => {
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
          const rectY = height * (1 - (selection.y + selection.height) / 100); // Invert Y for PDFLib
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

        addHistoryItem({
          filename: `cleaned_${file.name}`,
          toolName: 'Watermark Remover',
          downloadUrl: cleanUrl,
          fileSizeText: `${(blob.size / 1024).toFixed(1)} KB`,
        });
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
              addHistoryItem({
                filename: `cleaned_${file.name}`,
                toolName: 'Watermark Remover',
                downloadUrl: cleanUrl,
                fileSizeText: `${(blob.size / 1024).toFixed(1)} KB`,
              });
            }
          }, file.type);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error clearing watermark.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Decoupled Action 2: Download Cleaned File
  const handleDownloadCleaned = () => {
    if (!cleanedPreviewUrl || !file) return;
    const a = document.createElement('a');
    a.href = cleanedPreviewUrl;
    a.download = `cleaned_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link href="/" className="text-blue-600 font-semibold hover:underline cursor-pointer text-sm mb-4 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-black">Precision Watermark Remover</h1>
        <p className="text-slate-600 text-sm mt-2">User-guided selection overlay tool to remove target text watermarks from PDFs and images.</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {/* Upload Section */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-black">1. Upload PDF or Image File</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:bg-slate-100/50 transition-all"
          >
            <p className="text-3xl">🧹</p>
            <p className="text-sm font-bold text-black mt-2">
              {file ? file.name : 'Click to upload PDF or Image (.pdf, .jpg, .png, .webp)'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* PDF Page Navigation */}
        {fileType === 'pdf' && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1 || isProcessing}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all cursor-pointer"
            >
              ← Prev Page
            </button>
            <span className="text-xs font-bold text-black">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || isProcessing}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all cursor-pointer"
            >
              Next Page →
            </button>
          </div>
        )}

        {isProcessing && !previewUrl && (
          <div className="text-center py-8">
            <p className="text-sm font-bold text-blue-600 animate-pulse">Loading document preview...</p>
          </div>
        )}

        {/* Configuration & Interactive Selection Box Overlay */}
        {file && previewUrl && (
          <div className="space-y-6 border-t border-slate-100 pt-6">
            <div className="space-y-2 text-center">
              <p className="text-xs font-bold text-slate-500">
                Drag handles (mouse/touch) to resize and position white mask over watermark:
              </p>
              <div className="flex justify-center">
                <div
                  ref={containerRef}
                  className="relative inline-block overflow-hidden rounded-2xl border border-slate-300 select-none bg-slate-100 touch-none"
                >
                  <img src={isHoldingOriginal ? previewUrl : (cleanedPreviewUrl || previewUrl)} alt="Preview" className="max-h-[55vh] object-contain block pointer-events-none" />

                  {/* Watermark Selection Box Overlay (Visible unless holding original view) */}
                  {!isHoldingOriginal && (
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'move')}
                    onTouchStart={(e) => handleTouchStart(e, 'move')}
                    className="absolute cursor-move border-2 border-dashed border-red-500 bg-red-500/20 touch-none overflow-visible shadow-lg"
                    style={{
                      top: `${selection.y}%`,
                      left: `${selection.x}%`,
                      width: `${selection.width}%`,
                      height: `${selection.height}%`,
                    }}
                  >
                    <span className="absolute -top-5 left-0 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                      Watermark Target Mask
                    </span>

                    {/* Corner Handles */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'nw')}
                      onTouchStart={(e) => handleTouchStart(e, 'nw')}
                      className="absolute -top-3 -left-3 w-6 h-6 bg-white border-2 border-red-600 rounded-full cursor-nw-resize shadow-md"
                    ></div>
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'ne')}
                      onTouchStart={(e) => handleTouchStart(e, 'ne')}
                      className="absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-red-600 rounded-full cursor-ne-resize shadow-md"
                    ></div>
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'sw')}
                      onTouchStart={(e) => handleTouchStart(e, 'sw')}
                      className="absolute -bottom-3 -left-3 w-6 h-6 bg-white border-2 border-red-600 rounded-full cursor-sw-resize shadow-md"
                    ></div>
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'se')}
                      onTouchStart={(e) => handleTouchStart(e, 'se')}
                      className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-red-600 rounded-full cursor-se-resize shadow-md"
                    ></div>

                    {/* Side Handles */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'n')}
                      onTouchStart={(e) => handleTouchStart(e, 'n')}
                      className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-6 h-4 bg-white border-2 border-red-600 rounded-md cursor-n-resize shadow-sm"
                    ></div>
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 's')}
                      onTouchStart={(e) => handleTouchStart(e, 's')}
                      className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-4 bg-white border-2 border-red-600 rounded-md cursor-s-resize shadow-sm"
                    ></div>
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'w')}
                      onTouchStart={(e) => handleTouchStart(e, 'w')}
                      className="absolute top-1/2 -translate-y-1/2 -left-2.5 w-4 h-6 bg-white border-2 border-red-600 rounded-md cursor-w-resize shadow-sm"
                    ></div>
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'e')}
                      onTouchStart={(e) => handleTouchStart(e, 'e')}
                      className="absolute top-1/2 -translate-y-1/2 -right-2.5 w-4 h-6 bg-white border-2 border-red-600 rounded-md cursor-e-resize shadow-sm"
                    ></div>
                  </div>
                  )}
                </div>
              </div>
            </div>

            {/* Decoupled Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={handleRemoveWatermarkPreview}
                disabled={isProcessing}
                className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-6 py-4 rounded-2xl cursor-pointer transition-all shadow-sm"
              >
                {isProcessing ? 'Applying Adaptive Mask...' : '✨ Apply Clean Mask & Preview'}
              </button>

              <button
                onMouseDown={() => setIsHoldingOriginal(true)}
                onMouseUp={() => setIsHoldingOriginal(false)}
                onMouseLeave={() => setIsHoldingOriginal(false)}
                onTouchStart={() => setIsHoldingOriginal(true)}
                onTouchEnd={() => setIsHoldingOriginal(false)}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-6 py-4 rounded-2xl cursor-pointer transition-all shadow-sm select-none touch-none"
              >
                👁️ Hold for Original
              </button>

              <button
                onClick={handleDownloadCleaned}
                disabled={!cleanedPreviewUrl}
                className={`text-xs font-bold px-6 py-4 rounded-2xl transition-all shadow-sm ${
                  cleanedPreviewUrl
                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                ↓ Download Cleaned File
              </button>
            </div>

            {/* Render Large Cleaned Result Comparison View */}
            {cleanedPreviewUrl && (
              <div className="space-y-6 bg-slate-50 border border-slate-200 p-6 sm:p-8 rounded-3xl text-center animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-black uppercase tracking-wider text-left">
                      ✨ Cleaned Watermark Result Preview
                    </h3>
                    <p className="text-xs text-slate-500 text-left mt-0.5">
                      Verify mask coverage on your document before downloading.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-green-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-green-700 border-b border-green-50 pb-2">
                    <span>Cleaned Output Document</span>
                    <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-extrabold">Clean Mask Applied</span>
                  </div>
                  <img
                    src={isHoldingOriginal ? previewUrl! : cleanedPreviewUrl}
                    alt="Cleaned Output View"
                    className="max-h-[520px] w-auto mx-auto object-contain rounded-xl border border-green-200 shadow-xs"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
