'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function CgpaClient() {
  const [mode, setMode] = useState<'cgpaToPercent' | 'percentToCgpa' | 'semester'>('cgpaToPercent');
  const [scale, setScale] = useState<number>(9.5); // Default CBSE/AICTE 9.5 factor

  // Inputs
  const [cgpaInput, setCgpaInput] = useState<string>('');
  const [percentInput, setPercentInput] = useState<string>('');

  // Semester Calculator state
  const [semesters, setSemesters] = useState<{ id: string; sgpa: string }[]>([
    { id: '1', sgpa: '' },
    { id: '2', sgpa: '' },
  ]);

  // Calculations
  const calculatedPercent = cgpaInput ? (parseFloat(cgpaInput) * scale).toFixed(2) : '0.00';
  const calculatedCgpa = percentInput ? (parseFloat(percentInput) / scale).toFixed(2) : '0.00';

  // Semester Calculations (Simple Average of Valid SGPAs)
  const calculateOverallCgpa = () => {
    let totalSgpaSum = 0;
    let validSgpaCount = 0;

    semesters.forEach((s) => {
      const sgpaVal = parseFloat(s.sgpa);
      if (!isNaN(sgpaVal) && sgpaVal > 0) {
        totalSgpaSum += sgpaVal;
        validSgpaCount += 1;
      }
    });

    if (validSgpaCount > 0) {
      return (totalSgpaSum / validSgpaCount).toFixed(2);
    }
    return '0.00';
  };

  const overallCgpa = calculateOverallCgpa();
  const overallPercent = (parseFloat(overallCgpa) * scale).toFixed(2);

  const addSemester = () => {
    setSemesters((prev) => [...prev, { id: Math.random().toString(), sgpa: '' }]);
  };

  const removeSemester = (id: string) => {
    setSemesters((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSemester = (id: string, value: string) => {
    setSemesters((prev) =>
      prev.map((s) => (s.id === id ? { ...s, sgpa: value } : s))
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link href="/" className="text-blue-600 font-semibold hover:underline cursor-pointer text-sm mb-4 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-black">CGPA to Percentage Converter</h1>
        <p className="text-slate-600 text-sm mt-2">Convert grades to percentages effortlessly or calculate overall CGPA across semesters.</p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
        <button
          onClick={() => setMode('cgpaToPercent')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
            mode === 'cgpaToPercent'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          CGPA ➔ Percentage
        </button>
        <button
          onClick={() => setMode('percentToCgpa')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
            mode === 'percentToCgpa'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Percentage ➔ CGPA
        </button>
        <button
          onClick={() => setMode('semester')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
            mode === 'semester'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          🎓 Semester-Wise SGPA Calculator
        </button>
      </div>

      {/* Main Card Container */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        
        {/* Conversion Multiplier Standard Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div>
            <p className="text-xs font-bold text-black">Grading Scale Formula</p>
            <p className="text-[11px] text-slate-500">Standard CBSE/AICTE uses 9.5x formula (% = CGPA × 9.5)</p>
          </div>
          <div className="flex gap-2">
            {[9.5, 10, 9.0].map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
                  scale === s
                    ? 'bg-blue-50 border-blue-300 text-blue-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {s}x Scale
              </button>
            ))}
          </div>
        </div>

        {/* MODE 1: CGPA TO PERCENTAGE */}
        {mode === 'cgpaToPercent' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black">Enter CGPA (0 - 10)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={cgpaInput}
                onChange={(e) => setCgpaInput(e.target.value)}
                placeholder="e.g. 8.5"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-black text-lg font-bold focus:outline-none focus:border-blue-600 transition-all"
              />
            </div>

            <div className="bg-blue-50/60 border border-blue-100 p-6 rounded-2xl text-center space-y-1">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Equivalent Percentage</p>
              <p className="text-4xl font-black text-black">{calculatedPercent}%</p>
              <p className="text-[11px] text-slate-500 mt-2">Formula: {cgpaInput || '0'} × {scale}</p>
            </div>
          </div>
        )}

        {/* MODE 2: PERCENTAGE TO CGPA */}
        {mode === 'percentToCgpa' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black">Enter Percentage (0% - 100%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={percentInput}
                onChange={(e) => setPercentInput(e.target.value)}
                placeholder="e.g. 80.75"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-black text-lg font-bold focus:outline-none focus:border-blue-600 transition-all"
              />
            </div>

            <div className="bg-blue-50/60 border border-blue-100 p-6 rounded-2xl text-center space-y-1">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Equivalent CGPA</p>
              <p className="text-4xl font-black text-black">{calculatedCgpa} / 10</p>
              <p className="text-[11px] text-slate-500 mt-2">Formula: {percentInput || '0'} ÷ {scale}</p>
            </div>
          </div>
        )}

        {/* MODE 3: SEMESTER-WISE SGPA CALCULATOR */}
        {mode === 'semester' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-md">
              <div className="text-center md:text-left">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Calculated Overall CGPA</p>
                <p className="text-4xl font-black text-blue-400 mt-1">{overallCgpa} <span className="text-lg text-slate-400 font-normal">/ 10</span></p>
              </div>
              <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Equivalent Percentage</p>
                <p className="text-4xl font-black text-green-400 mt-1">{overallPercent}%</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-black text-sm">Semester SGPA</h3>
                <button
                  onClick={addSemester}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer transition-all"
                >
                  + Add Semester
                </button>
              </div>

              <div className="space-y-3">
                {semesters.map((sem, index) => (
                  <div key={sem.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="font-bold text-xs text-black w-20">Sem {index + 1}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      placeholder="Enter SGPA (e.g. 8.2)"
                      value={sem.sgpa}
                      onChange={(e) => updateSemester(sem.id, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-600"
                    />
                    {semesters.length > 1 && (
                      <button
                        onClick={() => removeSemester(sem.id)}
                        className="text-slate-400 hover:text-red-600 px-2 py-1 text-xs cursor-pointer font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
