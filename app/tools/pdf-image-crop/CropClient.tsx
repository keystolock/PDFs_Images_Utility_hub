'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { addHistoryItem } from '@/lib/historyStore';

export default function CropClient() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);

  // PDF Pagination States
  const pdfDocRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);

  // Manual Crop Box Coordinates (Percentages: 0 to 100). Starts at 100% full bounds
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [dragType, setDragType] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, startCrop: { x: 0, y: 0, width: 100, height: 100 } });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderPdfPage = async (pdfDoc: any, pageNum: number) => {
    setIsProcessing(true);
    setPreviewUrl(null);
    setCroppedPreviewUrl(null);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      setPreviewUrl(canvas.toDataURL('image/jpeg', 0.95));
      setCropBox({ x: 0, y: 0, width: 100, height: 100 }); // Default 100% full frame
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
      setCroppedPreviewUrl(null);
      setCropBox({ x: 0, y: 0, width: 100, height: 100 });

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

  // --- Mouse & Touch Event Handlers for Mobile & Desktop ---
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

  // Decoupled Action 1: Preview Crop Result
  const handlePreviewCrop = async () => {
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
        setCroppedPreviewUrl(dataUrl);

        const pageSuffix = fileType === 'pdf' ? `_page-${currentPage}` : '';
        const outName = `cropped_${file?.name.replace(/\.[^/.]+$/, '')}${pageSuffix}.jpg`;
        addHistoryItem({
          filename: outName,
          toolName: 'Crop Tool',
          downloadUrl: dataUrl,
          fileSizeText: `${cropW}×${cropH}px`,
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to preview crop.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Decoupled Action 2: Download Cropped File
  const handleDownloadCroppedJpg = () => {
    if (!croppedPreviewUrl || !file) return;
    const a = document.createElement('a');
    a.href = croppedPreviewUrl;
    const pageSuffix = fileType === 'pdf' ? `_page-${currentPage}` : '';
    a.download = `cropped_${file.name.replace(/\.[^/.]+$/, '')}${pageSuffix}.jpg`;
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
        <h1 className="text-3xl sm:text-4xl font-black text-black">Crop & Export Images / PDFs</h1>
        <p className="text-slate-600 text-sm mt-2">Responsive mobile/desktop cropping frame. Preview your crop before committing to download.</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-3">
          <label className="block text-sm font-bold text-black">1. Upload PDF Document or Image</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:bg-slate-100/50 transition-all"
          >
            <p className="text-3xl">✂️</p>
            <p className="text-sm font-bold text-black mt-2">
              {file ? file.name : 'Click to upload PDF or Image (.pdf, .jpg, .png)'}
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
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all"
            >
              ← Prev
            </button>
            <span className="text-sm font-bold text-black">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || isProcessing}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-all"
            >
              Next →
            </button>
          </div>
        )}

        {isProcessing && !previewUrl && (
          <div className="text-center py-8">
            <p className="text-sm font-bold text-blue-600 animate-pulse">Rendering preview...</p>
          </div>
        )}

        {previewUrl && (
          <div className="space-y-6 border-t border-slate-100 pt-6">
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 text-center">Drag handles (touch/mouse) to resize crop frame:</p>
              <div className="flex justify-center">
                
                <div
                  ref={containerRef}
                  className="relative inline-block overflow-hidden rounded-2xl border border-slate-300 select-none bg-slate-100 touch-none"
                >
                  <img src={previewUrl} alt="Preview" className="max-h-[55vh] object-contain block pointer-events-none" />
                  
                  {/* Dark Overlay outside crop area */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                    onTouchStart={(e) => handleTouchStart(e, 'move')}
                    className="absolute cursor-move overflow-visible touch-none"
                    style={{
                      top: `${cropBox.y}%`,
                      left: `${cropBox.x}%`,
                      width: `${cropBox.width}%`,
                      height: `${cropBox.height}%`,
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                      border: '2px solid #3b82f6',
                    }}
                  >
                    {/* Grid Lines */}
                    <div className="absolute w-full h-1/3 top-1/3 border-y border-white/40 pointer-events-none"></div>
                    <div className="absolute h-full w-1/3 left-1/3 border-x border-white/40 pointer-events-none"></div>

                    {/* Resize Handles for Touch & Mouse */}
                    <div 
                      onMouseDown={(e) => handleMouseDown(e, 'nw')}
                      onTouchStart={(e) => handleTouchStart(e, 'nw')}
                      className="absolute -top-3 -left-3 w-6 h-6 bg-white border-2 border-blue-600 rounded-full cursor-nw-resize shadow-md"
                    ></div>
                    <div 
                      onMouseDown={(e) => handleMouseDown(e, 'ne')}
                      onTouchStart={(e) => handleTouchStart(e, 'ne')}
                      className="absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-blue-600 rounded-full cursor-ne-resize shadow-md"
                    ></div>
                    <div 
                      onMouseDown={(e) => handleMouseDown(e, 'sw')}
                      onTouchStart={(e) => handleTouchStart(e, 'sw')}
                      className="absolute -bottom-3 -left-3 w-6 h-6 bg-white border-2 border-blue-600 rounded-full cursor-sw-resize shadow-md"
                    ></div>
                    <div 
                      onMouseDown={(e) => handleMouseDown(e, 'se')}
                      onTouchStart={(e) => handleTouchStart(e, 'se')}
                      className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-blue-600 rounded-full cursor-se-resize shadow-md"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decoupled Action Buttons: Preview Crop and Download */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handlePreviewCrop}
                disabled={isProcessing}
                className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-6 py-4 rounded-2xl cursor-pointer transition-all shadow-sm"
              >
                👁️ Preview Crop
              </button>

              <button
                onClick={handleDownloadCroppedJpg}
                disabled={!croppedPreviewUrl}
                className={`text-xs font-bold px-6 py-4 rounded-2xl transition-all shadow-sm ${
                  croppedPreviewUrl
                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                ↓ Download Cropped JPG
              </button>
            </div>

            {/* Render Large Comparison & Preview Result */}
            {croppedPreviewUrl && (
              <div className="space-y-6 bg-slate-50 border border-slate-200 p-6 sm:p-8 rounded-3xl text-center animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-black uppercase tracking-wider text-left">
                      🖼️ Visual Comparison: Original vs Cropped Result
                    </h3>
                    <p className="text-xs text-slate-500 text-left mt-0.5">
                      Both images are rendered large for inspection before downloading.
                    </p>
                  </div>
                  <button
                    onMouseDown={() => setIsHoldingOriginal(true)}
                    onMouseUp={() => setIsHoldingOriginal(false)}
                    onMouseLeave={() => setIsHoldingOriginal(false)}
                    onTouchStart={() => setIsHoldingOriginal(true)}
                    onTouchEnd={() => setIsHoldingOriginal(false)}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer select-none touch-none shadow-sm flex items-center gap-1.5"
                  >
                    👁️ Hold to Flash Original
                  </button>
                </div>

                {/* Big Side-by-Side / Stacked Comparison View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Left: Big Original Image */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                      <span>Original Image</span>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">Full Bounds</span>
                    </div>
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Original Full View"
                        className="max-h-[480px] w-auto mx-auto object-contain rounded-xl border border-slate-200 shadow-xs"
                      />
                    )}
                  </div>

                  {/* Right: Big Cropped Result */}
                  <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-blue-700 border-b border-blue-50 pb-2">
                      <span>Cropped Output Result</span>
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-extrabold">Ready</span>
                    </div>
                    <img
                      src={isHoldingOriginal ? previewUrl! : croppedPreviewUrl}
                      alt="Cropped Result View"
                      className="max-h-[480px] w-auto mx-auto object-contain rounded-xl border border-blue-200 shadow-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
