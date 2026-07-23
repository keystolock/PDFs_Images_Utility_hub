'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function QrClient() {
  const [activeTab, setActiveTab] = useState<'age' | 'qr'>('age');

  // --- Age Calculator State ---
  const [birthDate, setBirthDate] = useState<string>('');
  const [ageResult, setAgeResult] = useState<{
    years: number;
    months: number;
    days: number;
    totalDays: number;
    totalHours: number;
  } | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number | null>(null);

  // Live ticker for seconds
  useEffect(() => {
    if (!birthDate || !ageResult) return;
    const interval = setInterval(() => {
      const dob = new Date(birthDate);
      const now = new Date();
      const diffMs = Math.max(0, now.getTime() - dob.getTime());
      setTotalSeconds(Math.floor(diffMs / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [birthDate, ageResult]);

  const calculateAge = () => {
    if (!birthDate) return;
    const dob = new Date(birthDate);
    const today = new Date();

    if (dob > today) {
      alert('Please select a valid past date of birth.');
      return;
    }

    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    let days = today.getDate() - dob.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const diffTime = Math.abs(today.getTime() - dob.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalHours = totalDays * 24;

    setAgeResult({ years, months, days, totalDays, totalHours });
    setTotalSeconds(Math.floor(diffTime / 1000));
  };

  // Age Summary Download Fix (Programmatic Canvas Blob Download)
  const handleDownloadAgeReport = () => {
    if (!ageResult) return;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Card background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 600, 400);

    // Border glow
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 580, 380);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('Exact Age Metric Report', 40, 60);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Date of Birth: ${birthDate}`, 40, 90);

    // Primary Age
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText(`${ageResult.years} Years, ${ageResult.months} Months, ${ageResult.days} Days`, 40, 170);

    // Sub metrics
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Total Days Lived: ${ageResult.totalDays.toLocaleString()}`, 40, 240);
    ctx.fillText(`Total Hours Lived: ${ageResult.totalHours.toLocaleString()}`, 40, 280);

    // Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText('Generated 100% Client-Side via Paperless', 40, 350);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `age-report-${birthDate}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    }, 'image/png');
  };

  // --- QR Generator State ---
  const [qrText, setQrText] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrText || 'https://example.com')}`;

  // QR Code Download Fix (Programmatic Fetch & Blob URL virtual anchor download)
  const handleDownloadQr = async (e: React.MouseEvent) => {
    e.preventDefault();
    setQrLoading(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'qrcode.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
      alert('Failed to download QR Code.');
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link href="/" className="text-blue-600 font-semibold hover:underline cursor-pointer text-sm mb-4 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-black">Age Calculator & QR Code Generator</h1>
        <p className="text-slate-600 text-sm mt-2">Calculate your exact age metrics or create custom, instant QR codes for free.</p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-3 border-b border-slate-200 pb-4">
        <button
          onClick={() => setActiveTab('age')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
            activeTab === 'age'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          🎂 Exact Age Calculator
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
            activeTab === 'qr'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          📱 Custom QR Code Generator
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        
        {/* TAB 1: AGE CALCULATOR */}
        {activeTab === 'age' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-bold text-black">Select Date of Birth</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-black font-bold focus:outline-none focus:border-blue-600 transition-all text-sm"
                />
              </div>
              <button
                onClick={calculateAge}
                className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-6 py-4 rounded-2xl cursor-pointer transition-all shadow-sm w-full"
              >
                Calculate Age
              </button>
            </div>

            {/* Age Results */}
            {ageResult && (
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
                    <p className="text-3xl font-black text-blue-600">{ageResult.years}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">Years</p>
                  </div>
                  <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
                    <p className="text-3xl font-black text-black">{ageResult.months}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">Months</p>
                  </div>
                  <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
                    <p className="text-3xl font-black text-black">{ageResult.days}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">Days</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center pt-2">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                    <p className="text-lg font-black text-black">{ageResult.totalDays.toLocaleString()}</p>
                    <p className="text-xs font-bold text-slate-500">Total Days</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                    <p className="text-lg font-black text-black">{ageResult.totalHours.toLocaleString()}</p>
                    <p className="text-xs font-bold text-slate-500">Total Hours</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                    <p className="text-lg font-black text-green-600 font-mono">
                      {totalSeconds !== null ? totalSeconds.toLocaleString() : '0'}
                    </p>
                    <p className="text-xs font-bold text-slate-500">Live Seconds Lived ⏱️</p>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <button
                    onClick={handleDownloadAgeReport}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-8 py-3.5 rounded-full cursor-pointer transition-all shadow-md inline-flex items-center gap-2"
                  >
                    ↓ Download Age Metric Card (.png)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QR GENERATOR */}
        {activeTab === 'qr' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-black">Enter Website URL or Text</label>
                <textarea
                  rows={4}
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  placeholder="Paste text or link"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-black text-sm focus:outline-none focus:border-blue-600 transition-all resize-none"
                ></textarea>
              </div>
            </div>

            {/* QR Code Output */}
            <div className="flex flex-col items-center justify-center space-y-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md">
                <img src={qrUrl} alt="Generated QR Code" className="w-48 h-48 object-contain" />
              </div>

              <button
                onClick={handleDownloadQr}
                disabled={qrLoading}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-6 py-3 rounded-xl cursor-pointer transition-all shadow-sm inline-flex items-center gap-2"
              >
                {qrLoading ? 'Preparing File...' : '↓ Download High-Res QR Code (.png)'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
