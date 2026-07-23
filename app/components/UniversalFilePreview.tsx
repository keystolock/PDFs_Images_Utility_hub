'use client';
import React, { useState, useEffect, useRef } from 'react';

interface UniversalFilePreviewProps {
  files: File[];
  activeFileIndex?: number;
  onFilesSelected: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
  onSelectActiveIndex?: (index: number) => void;
  multiple?: boolean;
  accept?: string;
  label?: string;
  subLabel?: string;
}

export function UniversalFilePreview({
  files,
  activeFileIndex = 0,
  onFilesSelected,
  onRemoveFile,
  onSelectActiveIndex,
  multiple = true,
  accept = 'image/*,application/pdf,.doc,.docx',
  label = 'Drag & drop files here or click to browse',
  subLabel = 'Supports PDF, JPG, PNG, WEBP, DOCX',
}: UniversalFilePreviewProps) {
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<{ url?: string; dimensions?: string; pageCount?: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate previews for image files & metadata for PDF files
  useEffect(() => {
    let isMounted = true;
    const newPreviews: { url?: string; dimensions?: string; pageCount?: number }[] = [];

    const loadMetadata = async () => {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          const img = new Image();
          await new Promise((res) => {
            img.onload = () => {
              if (isMounted) {
                newPreviews.push({ url, dimensions: `${img.width} × ${img.height} px` });
              }
              res(null);
            };
            img.onerror = () => {
              if (isMounted) {
                newPreviews.push({ url, dimensions: 'Unknown' });
              }
              res(null);
            };
            img.src = url;
          });
        } else if (file.type === 'application/pdf') {
          newPreviews.push({ dimensions: 'PDF Document' });
        } else {
          newPreviews.push({ dimensions: file.name.split('.').pop()?.toUpperCase() || 'File' });
        }
      }
      if (isMounted) {
        setPreviews(newPreviews);
      }
    };

    loadMetadata();

    return () => {
      isMounted = false;
      previews.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
    };
  }, [files]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files);
      onFilesSelected(fileList);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      onFilesSelected(fileList);
    }
  };

  const activeFile = files[activeFileIndex] || null;
  const activePreview = previews[activeFileIndex] || null;

  return (
    <div className="space-y-4 w-full">
      {/* Drop Zone Input */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative p-6 sm:p-8 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer text-center select-none ${
          dragOver
            ? 'border-blue-500 bg-blue-50/40 scale-[1.02] shadow-xl ring-4 ring-blue-400/20'
            : 'border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50/10 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-blue-100">
            📁
          </div>
          <div>
            <p className="font-extrabold text-base sm:text-lg text-black">{label}</p>
            <p className="text-slate-400 text-xs mt-1 font-medium">{subLabel}</p>
          </div>
          <button
            type="button"
            className="mt-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-6 py-2.5 rounded-full shadow-md transition-all"
          >
            Select File{multiple ? 's' : ''}
          </button>
        </div>
      </div>

      {/* File Preview & List Display */}
      {files.length > 0 && (
        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Selected Files ({files.length})
            </span>
            {onRemoveFile && (
              <span className="text-[11px] text-blue-400 font-semibold">Click a file to select</span>
            )}
          </div>

          {/* Active Main Preview Box */}
          {activeFile && (
            <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
              {activeFile.type.startsWith('image/') && activePreview?.url ? (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-700">
                  <img
                    src={activePreview.url}
                    alt="Active Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-blue-600/20 text-blue-400 flex flex-col items-center justify-center flex-shrink-0 border border-blue-500/30">
                  <span className="text-3xl">📄</span>
                  <span className="text-[10px] font-bold mt-1 uppercase">
                    {activeFile.name.split('.').pop()}
                  </span>
                </div>
              )}

              <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate" title={activeFile.name}>
                  {activeFile.name}
                </p>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-300 font-medium pt-1">
                  <span className="bg-slate-700/80 px-2.5 py-1 rounded-lg">
                    💾 {(activeFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                  {activePreview?.dimensions && (
                    <span className="bg-slate-700/80 px-2.5 py-1 rounded-lg">
                      📐 {activePreview.dimensions}
                    </span>
                  )}
                  <span className="bg-blue-600/30 text-blue-300 px-2.5 py-1 rounded-lg uppercase">
                    {activeFile.type || activeFile.name.split('.').pop()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Queue List Pill Grid */}
          {files.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectActiveIndex && onSelectActiveIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                    activeFileIndex === idx
                      ? 'bg-blue-600/30 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span>{file.type.startsWith('image/') ? '🖼️' : '📄'}</span>
                    <span className="truncate font-medium">{file.name}</span>
                  </div>
                  {onRemoveFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(idx);
                      }}
                      className="text-slate-400 hover:text-red-400 p-1 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
