'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import Tesseract from 'tesseract.js';

export default function WordCounterPage() {
  const [text, setText] = useState('');
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time Calculations
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const characters = text.length;
  const sentences = text.trim() === '' ? 0 : text.split(/[.!?]+/).filter(Boolean).length;
  const paragraphs = text.trim() === '' ? 0 : text.split(/\n+/).filter(Boolean).length;
  const readingTime = Math.ceil(words / 200); // ~200 words per minute average

  const handleClear = () => setText('');
  const handleCopy = () => navigator.clipboard.writeText(text);
  const handleUpper = () => setText(text.toUpperCase());
  const handleLower = () => setText(text.toLowerCase());

  // Real Tesseract.js OCR File Handler for Images & PDF
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setOcrStatus('processing');
    setOcrProgress(10);
    setStatusMsg(`Loading ${file.name}...`);

    try {
      if (file.type === 'application/pdf') {
        // PDF Text Extraction via PDF.js CDN
        setStatusMsg('Loading PDF rendering engine...');
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
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedPdfText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          setOcrProgress(Math.round((i / pdf.numPages) * 90));
          setStatusMsg(`Extracting text from page ${i} of ${pdf.numPages}...`);
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          
          if (pageText.trim()) {
            extractedPdfText += `\n--- Page ${i} ---\n` + pageText + '\n';
          } else {
            // Fallback to Canvas OCR via Tesseract.js for scanned PDF pages
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport }).promise;

            const worker = await Tesseract.createWorker('eng');
            const ret = await worker.recognize(canvas);
            await worker.terminate();
            extractedPdfText += `\n--- Page ${i} (OCR Scanned) ---\n` + ret.data.text + '\n';
          }
        }

        setText((prev) => (prev ? prev + '\n\n' : '') + extractedPdfText.trim());
        setOcrStatus('success');
        setOcrProgress(100);
      } else {
        // Image OCR via Tesseract.js
        setStatusMsg('Initializing Tesseract OCR worker...');
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
              setStatusMsg(`Scanning text... (${Math.round(m.progress * 100)}%)`);
            }
          },
        });

        const ret = await worker.recognize(file);
        await worker.terminate();

        if (ret.data.text) {
          setText((prev) => (prev ? prev + '\n\n' : '') + ret.data.text.trim());
          setOcrStatus('success');
          setOcrProgress(100);
        } else {
          alert('No text detected in image.');
          setOcrStatus('idle');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to parse text from file.');
      setOcrStatus('error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link href="/" className="text-blue-600 font-semibold hover:underline cursor-pointer text-sm mb-4 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-black">Word Counter, Code Analysis & OCR</h1>
        <p className="text-slate-600 text-sm mt-2">Instant word metrics, text transformations, and image/PDF text extraction.</p>
      </div>

      {/* Real-time Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-2xl sm:text-3xl font-black text-blue-600">{words}</p>
          <p className="text-xs font-bold text-slate-500 mt-1">Words</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-2xl sm:text-3xl font-black text-black">{characters}</p>
          <p className="text-xs font-bold text-slate-500 mt-1">Characters</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-2xl sm:text-3xl font-black text-black">{sentences}</p>
          <p className="text-xs font-bold text-slate-500 mt-1">Sentences</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-2xl sm:text-3xl font-black text-black">{paragraphs}</p>
          <p className="text-xs font-bold text-slate-500 mt-1">Paragraphs</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center col-span-2 sm:col-span-1">
          <p className="text-2xl sm:text-3xl font-black text-green-600">{readingTime} min</p>
          <p className="text-xs font-bold text-slate-500 mt-1">Read Time</p>
        </div>
      </div>

      {/* Main Text / Code Input Box */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <label className="block text-sm font-bold text-black">Paste Your Text or Code Here:</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleUpper} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all">UPPERCASE</button>
            <button onClick={handleLower} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all">lowercase</button>
            <button onClick={handleCopy} className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all">Copy Text</button>
            <button onClick={handleClear} className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all">Clear</button>
          </div>
        </div>

        <textarea
          rows={12}
          spellCheck={true}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type code / text here for instant word counts and analysis..."
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-black text-sm font-mono focus:outline-none focus:border-blue-600 transition-all resize-y"
        ></textarea>

        {/* OCR Image/PDF Upload Section with Live Progress Bar */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-black text-sm">Image & PDF OCR Scanner</h3>
              <p className="text-slate-500 text-xs">Upload an image or PDF document to extract text directly into the editor.</p>
            </div>
            <label className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-6 py-3 rounded-xl cursor-pointer transition-all shadow-sm flex items-center gap-2 flex-shrink-0">
              {ocrStatus === 'processing' ? '🔍 Scanning Text...' : '📷 Upload Image or PDF for OCR'}
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleOcrUpload} className="hidden" />
            </label>
          </div>

          {ocrStatus === 'processing' && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl space-y-2 animate-in fade-in duration-200">
              <div className="flex justify-between text-xs font-bold text-blue-900">
                <span>{statusMsg}</span>
                <span>{ocrProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-[2px] transition-all duration-300 ease-out"
                  style={{ width: `${ocrProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}