'use client';

import React, { useState, useEffect } from 'react';
import { HistoryItem, getHistory, clearHistory } from '@/lib/historyStore';

export default function HeaderHistoryDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);

  const loadHistory = () => {
    setItems(getHistory());
  };

  useEffect(() => {
    loadHistory();
    const handleUpdate = () => loadHistory();
    window.addEventListener('utilityHistoryUpdated', handleUpdate);
    return () => window.removeEventListener('utilityHistoryUpdated', handleUpdate);
  }, []);

  const handleClear = () => {
    clearHistory();
    setItems([]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-black hover:text-blue-600 font-semibold text-[15px] transition-colors cursor-pointer py-2"
        title="View temporary session download history"
      >
        <span>History</span>
        <span className="text-xs bg-slate-100 group-hover:bg-blue-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-200">
          🕒 {items.length}
        </span>
      </button>

      {/* Slide-over Modal / Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-lg font-black text-black flex items-center gap-2">
                  <span>🕒 Session Download History</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Temporary in-memory history for this session. Automatically deleted when you close the tab or press clear.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 text-xl font-bold rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 p-6 overflow-y-auto space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-3">
                  <span className="text-4xl block">📂</span>
                  <p className="text-sm font-semibold text-slate-600">No temporary downloads yet</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Any files you resize, crop, convert, or compress in this tab session will appear here temporarily.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex justify-between items-center gap-3 hover:border-blue-300 transition-all shadow-xs"
                  >
                    <div className="truncate flex-1">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">{item.toolName}</p>
                      <p className="font-semibold text-black text-sm truncate mt-0.5">{item.filename}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.fileSizeText} • {item.timestamp}
                      </p>
                    </div>

                    <a
                      href={item.downloadUrl}
                      download={item.filename}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
                    >
                      ↓ Download
                    </a>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer / Clear Button */}
            {items.length > 0 && (
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">
                  {items.length} temporary file{items.length > 1 ? 's' : ''} stored
                </span>
                <button
                  onClick={handleClear}
                  className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  🗑️ Clear History
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
