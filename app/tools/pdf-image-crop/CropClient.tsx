'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { addHistoryItem } from '@/lib/historyStore';

export default function CropClient() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // PDF Pagination States
  const pdfDocRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);

  // Manual Crop Box Coordinates (Percentages: 0 to 100)
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [dragType, setDragType] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, startCrop: { x: 10, y: 10, width: 80, height: 80 } });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderPdfPage = async (pdfDoc: any, pageNum: number) => {
    setIsProcessing(true);
    setPreviewUrl(null);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      setPreviewUrl(canvas.toDataURL('image/jpeg', 0.95));
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    } catch (err) {
      console.error(err);
      alert('Failed to load PDF page.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });

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
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdfDoc = await loadingTask.promise;
          
          pdfDocRef.current = pdfDoc;
          setTotalPages(pdfDoc.numPages);
          setCurrentPage(1);

          await renderPdfPage(pdfDoc, 1);
        } catch (err) {
          console.error(err);
          alert('Failed to load PDF.');
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

  // Touch & Mouse Drag Handlers
  const startDrag = (clientX: number, clientY: number, type: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    setDragType(type);
    dragStart.current = { 
      x: clientX, 
      y: clientY, 
      startCrop: { ...cropBox } 
    };
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX, e.clientY, type);
  };

  const handleTouchStart = (e: React.TouchEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
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
      const start = dragStart.current.startCrop;

      setCropBox(() => {
        let { x, y, width, height } = start;

        if (dragType === 'move') {
          x = Math.max(0, Math.min(100 - width, start.x + deltaX));
          y = Math.max(0, Math.min(100 - height, start.y + deltaY));
        } else if (dragType === 'se') {
          width = Math.max(5, Math.min(100 - x, start.width + deltaX));
          height = Math.max(5, Math.min(100 - y, start.height + deltaY));
        } else if (dragType === 'sw') {
          const newX = Math.max(0, Math.min(start.x + start.width - 5, start.x + deltaX));
          width = start.x + start.width - newX;
          x = newX;
          height = Math.max(5, Math.min(100 - y, start.height + deltaY));
        } else if (dragType === 'ne') {
          width = Math.max(5, Math.min(100 - x, start.width + deltaX));
          const newY = Math.max(0, Math.min(start.y + start.height - 5, start.y + deltaY));
          height = start.y + start.height - newY;
          y = newY;
        } else if (dragType === 'nw') {
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

    const handleMouseMove = (e: MouseEvent) => updateDrag(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateDrag(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleDragEnd = () => setDragType(null);

    if (dragType) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [dragType]);

  const handleInstantCropAndDownload = async () => {
    if (!previewUrl || !file) return;
    setIsProcessing(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.src = previewUrl;
      await new Promise((res) => { img.onload = res; });

      const startX = img.width * (cropBox.x / 100);
      const startY = img.height * (cropBox.y / 100);
      const cropW = img.width * (cropBox.width / 100);
      const cropH = img.height * (cropBox.height / 100);

      canvas.width = cropW;
      canvas.height = cropH;

      if (ctx) {
        ctx.drawImage(img, startX, startY, cropW, cropH, 0, 0, cropW, cropH);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

        const pageSuffix = fileType === 'pdf' ? `_page-${currentPage}` : '';
        const outName = `cropped_${file?.name.replace(/\.[^/.]+$/, '')}${pageSuffix}.jpg`;
        
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = outName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        addHistoryItem({
          filename: outName,
          toolName: 'Crop Tool',
          downloadUrl: dataUrl,
          fileSizeText: `${Math.round(cropW)}×${Math.round(cropH)}px`,
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to crop image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileType(null);
    setPreviewUrl(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title Header with Mobile Left Corner Alignment */}
      <div>
        <Link href="/" className="text-blue-600 font-bold hover:underline text-xs block text-left mb-2 w-fit">
          ← Back to Home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-black">Crop PDF & Images Online</h1>
        <p className="text-slate-500 text-xs mt-0.5">Crop specific areas of PDF pages or images with touch-friendly selection boxes.</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* INITIAL FILE DROP CONTAINER */}
      {!file && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center cursor-pointer hover:bg-slate-100/60 transition-all shadow-xs max-w-lg mx-auto"
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3 shadow-xs">
            ✂️
          </div>
          <p className="text-base font-extrabold text-black">Click or Drag & Drop File Here</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Supports PDF, PNG, JPG, WEBP • 100% Free</p>
        </div>
      )}

      {/* UNIFIED TOP RIBBON & CROP WORKSPACE */}
      {file && previewUrl && (
        <div className="space-y-6">
          
          {/* WOBBLE-FREE SYMMETRICAL 2-ROW RIBBON */}
          <div className="bg-white p-4 rounded-[24px] sm:rounded-full border border-slate-200 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
            {/* ROW 1: Page selectors & settings */}
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <span className="text-xs font-bold text-slate-700">Crop Ratio: Freeform Box</span>

              {fileType === 'pdf' && totalPages > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full shadow-inner">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="w-6 h-6 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center text-xs font-extrabold text-slate-700 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    ←
                  </button>
                  {/* Fixed-width Monospace to completely stop ribbon wobbling/shaking */}
                  <span className="text-xs font-mono font-bold text-black w-14 text-center inline-block tabular-nums select-none">
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="w-6 h-6 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center text-xs font-extrabold text-slate-700 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    →
                  </button>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            {/* ROW 2: Icon triggers & download action */}
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
                onClick={handleInstantCropAndDownload}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 rounded-full transition-all shadow-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap ml-1"
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
              className="relative inline-block overflow-hidden rounded-3xl border border-slate-300 bg-slate-100 max-w-full shadow-xl select-none min-h-[300px]"
            >
              <img
                src={previewUrl}
                alt="Crop Preview"
                className="max-h-[500px] w-auto block mx-auto rounded-2xl"
              />

              {!isHoldingOriginal && (
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'move')}
                  onTouchStart={(e) => handleTouchStart(e, 'move')}
                  className="absolute cursor-move overflow-visible touch-none border-2 border-blue-600 bg-blue-500/20 shadow-2xl"
                  style={{
                    top: `${cropBox.y}%`,
                    left: `${cropBox.x}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`,
                  }}
                >
                  <div className="absolute w-full h-1/3 top-1/3 border-y border-white/40 pointer-events-none"></div>
                  <div className="absolute h-full w-1/3 left-1/3 border-x border-white/40 pointer-events-none"></div>

                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'nw')}
                    onTouchStart={(e) => handleTouchStart(e, 'nw')}
                    className="absolute -top-3 -left-3 w-6 h-6 bg-white border-2 border-blue-600 rounded-full cursor-nw-resize shadow-md touch-none"
                  />
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'ne')}
                    onTouchStart={(e) => handleTouchStart(e, 'ne')}
                    className="absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-blue-600 rounded-full cursor-ne-resize shadow-md touch-none"
                  />
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'sw')}
                    onTouchStart={(e) => handleTouchStart(e, 'sw')}
                    className="absolute -bottom-3 -left-3 w-6 h-6 bg-white border-2 border-blue-600 rounded-full cursor-sw-resize shadow-md touch-none"
                  />
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                    onTouchStart={(e) => handleTouchStart(e, 'se')}
                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-blue-600 rounded-full cursor-se-resize shadow-md touch-none"
                  />
                </div>
              )}
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
