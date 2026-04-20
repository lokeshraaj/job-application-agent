"use client";

import { useEffect, useState } from "react";
import { fetchApplications, updateApplicationStatus, generatePitch, ApplicationResponse } from "@/lib/api";
import { Activity, Clock, FileText, CheckCircle2, PenTool, X, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { usePostHog } from 'posthog-js/react';

export default function ApplicationTrackerPage() {
  const [apps, setApps] = useState<ApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pitchModalApp, setPitchModalApp] = useState<ApplicationResponse | null>(null);
  const posthog = usePostHog();

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      const data = await fetchApplications();
      setApps(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load application memory.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appId: number, status: string) => {
    toast.loading("Updating Agent Memory...", { id: `status-${appId}` });
    try {
       await updateApplicationStatus(appId, status);
       toast.success(`Moved to ${status}!`, { id: `status-${appId}` });
       loadApps();
    } catch {
       toast.error("Could not update memory.", { id: `status-${appId}` });
    }
  };

  const columns = ["Applied", "Interviewing", "Offer", "Rejected"];

  const handleDraftPitch = async (app: ApplicationResponse) => {
    // If it already generated, just open modal
    if (app.cover_letter) {
      setPitchModalApp(app);
      posthog?.capture('draft_pitch_clicked', { cache: true });
      return;
    }
    
    posthog?.capture('draft_pitch_clicked', { cache: false });
    toast.loading("Groq is writing your pitch...", { id: `pitch-${app.id}` });
    try {
      const updatedApp = await generatePitch(app.id);
      toast.success("Ready to send!", { id: `pitch-${app.id}` });
      setPitchModalApp(updatedApp);
      loadApps();
    } catch {
      toast.error("Failed to generate pitch.", { id: `pitch-${app.id}` });
    }
  };

  const copyToClipboard = () => {
    if (pitchModalApp?.cover_letter) {
      navigator.clipboard.writeText(pitchModalApp.cover_letter);
      toast.success("Copied to clipboard!");
    }
  };

  if (loading) return <div className="text-center mt-20">Loading memory core...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full h-[calc(100vh-8rem)]">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Application Tracker</h1>
        <p className="mt-1 text-gray-400">Agent memory of your application processes. Kanban view.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
        {columns.map((col) => (
          <div key={col} className="glass-card p-4 flex flex-col border border-white/5 bg-black/20">
             <h3 className="font-semibold text-gray-300 mb-4 pb-2 border-b border-white/10 flex items-center justify-between">
                {col}
                <span className="text-xs py-1 px-2 rounded-full bg-white/10">
                   {apps.filter(a => a.status === col).length}
                </span>
             </h3>
             
             <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3">
               {apps.filter(a => a.status === col).map(app => (
                 <div key={app.id} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-sm group">
                    <div className="flex justify-between items-start mb-2">
                       <span className="font-bold text-gray-200">Job #{app.job_id}</span>
                       <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${app.match_score && app.match_score > 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                         Fit: {app.match_score ?? 'N/A'}%
                       </span>
                    </div>
                    <p className="text-gray-400 text-xs mb-3 flex items-center gap-1"><FileText size={12}/> Resume #{app.resume_id}</p>
                    
                    <div className="flex gap-2">
                      <select
                        className="flex-1 bg-black/40 border border-white/10 rounded overflow-hidden text-xs py-1.5 px-2 outline-none focus:border-blue-500 transition-colors"
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      >
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      
                      <button 
                         onClick={() => handleDraftPitch(app)}
                         className="flex items-center justify-center bg-blue-600/20 text-blue-400 border border-blue-500/30 w-8 h-8 rounded hover:bg-blue-600 hover:text-white transition-colors"
                         title="Draft Pitch"
                      >
                         <PenTool size={14} />
                      </button>
                    </div>
                 </div>
               ))}
               {apps.filter(a => a.status === col).length === 0 && (
                 <div className="text-center p-4 text-xs text-gray-600 border border-dashed border-gray-600/50 rounded-lg">
                    No records found in memory
                 </div>
               )}
             </div>
          </div>
        ))}
      </div>

      {/* PITCH MODAL */}
      {pitchModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="glass-card w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden relative">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                 <h2 className="font-bold flex items-center gap-2"><PenTool size={18} className="text-blue-400" /> Outreach Strategy Formulated</h2>
                 <button onClick={() => setPitchModalApp(null)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6">
                 <div className="bg-black/50 border border-white/5 p-4 rounded-xl text-sm leading-relaxed text-gray-300 font-mono whitespace-pre-wrap max-h-[50vh] overflow-y-auto hide-scrollbar">
                    {pitchModalApp.cover_letter}
                 </div>
              </div>
              <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-white/5">
                 <button onClick={() => setPitchModalApp(null)} className="px-4 py-2 rounded font-medium text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-all">Dismiss</button>
                 <button onClick={copyToClipboard} className="px-4 py-2 rounded font-medium text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center gap-2">
                    <Copy size={16} /> Copy to Clipboard
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
