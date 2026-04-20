"use client";

import { useState } from "react";
import { uploadResume, ResumeResponse } from "@/lib/api";
import { UploadCloud, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { usePostHog } from 'posthog-js/react';

export default function ResumeAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ResumeResponse | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const posthog = usePostHog();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const response = await uploadResume(file, 1);
      setResult(response);
      if (response.optimized_text) {
        setParsedData(JSON.parse(response.optimized_text));
        posthog?.capture('resume_uploaded');
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload/analyze resume.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Resume Analyzer</h1>
        <p className="mt-1 text-gray-400">Upload your PDF or DOCX file to get an AI-powered evaluation.</p>
      </header>

      {/* Upload Zone */}
      <div className="glass-card p-8 border-dashed border-2 border-white/20 text-center flex flex-col items-center justify-center transition-all hover:border-blue-500/50">
        <div className="p-4 bg-white/5 rounded-full mb-4">
          <UploadCloud size={32} className="text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Drag & Drop or Click to Upload</h3>
        <p className="text-sm text-gray-400 mb-6 max-w-sm">
          We use Groq powered Llama 3 to instantly parse, evaluate and extract your metrics. Supports PDF and DOCX.
        </p>
        
        <label className="cursor-pointer relative">
          <span className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/30">
            {file ? file.name : "Select Document"}
          </span>
          <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
        </label>

        {file && (
          <button 
            onClick={handleUpload}
            disabled={isProcessing}
            className="mt-6 px-8 py-2.5 bg-white text-black hover:bg-gray-200 font-semibold rounded-lg transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {isProcessing ? <><Loader2 className="animate-spin" size={18} /> Processing...</> : "Analyze with AI"}
          </button>
        )}
      </div>

      {/* Result Display */}
      {result && parsedData && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="glass-card p-6 lg:col-span-1">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <CheckCircle2 className="text-emerald-400" /> Summary
              </h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                   <div>
                     <p className="text-sm text-gray-400 mb-1">Total Experience</p>
                     <p className="text-2xl font-bold">{parsedData.experience_years ?? 0} <span className="text-sm text-gray-500 font-normal">Years</span></p>
                   </div>
                   <div className="flex flex-col items-center">
                     <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">ATS Score</p>
                     <div 
                       className={`flex items-center justify-center w-14 h-14 rounded-full border-4 shadow-lg backdrop-blur-sm font-bold text-lg
                       ${(parsedData.ats_score || 0) >= 80 ? 'border-emerald-500 text-emerald-400 shadow-emerald-500/20 bg-emerald-500/10' : 
                         (parsedData.ats_score || 0) >= 60 ? 'border-yellow-400 text-yellow-400 shadow-yellow-400/20 bg-yellow-400/10' : 
                         'border-red-500 text-red-500 shadow-red-500/20 bg-red-500/10'}`}
                     >
                       {parsedData.ats_score || 0}
                     </div>
                   </div>
                 </div>
                 <div>
                    <p className="text-sm text-gray-400 mb-2">Top Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.skills?.slice(0, 8).map((s: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                 </div>
              </div>
            </div>

            <div className="glass-card p-6 lg:col-span-2 flex flex-col">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <AlertTriangle className="text-yellow-400" /> AI Professional Readout
              </h3>
              <p className="text-gray-300 leading-relaxed text-sm mb-6 flex-grow">
                 {parsedData.professional_summary || "Our AI could not extract the summary correctly."}
              </p>

              <div className="border-t border-white/10 pt-6 mt-auto">
                <h4 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Scoring Breakdown</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-gray-400 mb-1">Format & Structure</p>
                    <p className="text-xl font-bold text-blue-400">{parsedData.format_score || 0}<span className="text-sm text-gray-500 font-normal">/100</span></p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-gray-400 mb-1">Keyword Match</p>
                    <p className="text-xl font-bold text-purple-400">{parsedData.keyword_score || 0}<span className="text-sm text-gray-500 font-normal">/100</span></p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-gray-400 mb-1">Business Impact</p>
                    <p className="text-xl font-bold text-emerald-400">{parsedData.impact_score || 0}<span className="text-sm text-gray-500 font-normal">/100</span></p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
          
          {/* AI Feedback Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="glass-card p-6 border-l-4 border-l-emerald-500 bg-emerald-500/5">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 text-emerald-400">
                  <CheckCircle2 size={20} /> The Good
                </h3>
                <ul className="space-y-3">
                  {parsedData.strengths?.length > 0 ? (
                    parsedData.strengths.map((str: string, idx: number) => (
                      <li key={idx} className="flex gap-3 text-sm text-emerald-100/90 leading-relaxed">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500 italic">No particular strengths highlighted.</li>
                  )}
                </ul>
             </div>
             
             <div className="glass-card p-6 border-l-4 border-l-red-500 bg-red-500/5">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 text-red-500">
                  <AlertTriangle size={20} /> Critical Improvements
                </h3>
                <ul className="space-y-3">
                  {parsedData.improvements?.length > 0 ? (
                    parsedData.improvements.map((imp: string, idx: number) => (
                      <li key={idx} className="flex gap-3 text-sm text-red-100/90 leading-relaxed">
                        <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <span>{imp}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500 italic">No critical improvements found. Solid execution!</li>
                  )}
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
