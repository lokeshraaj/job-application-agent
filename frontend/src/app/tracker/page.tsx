"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchApplications, updateKanbanStatus, generatePitch, submitPitchEdit,
  submitResumeEdit, fetchMemoryLog, ApplicationResponse, MemoryLogItem,
  JobListingResponse, fetchJobMatches,
} from "@/lib/api";
import {
  Activity, FileText, PenTool, X, Copy, Brain, Sparkles,
  TrendingUp, TrendingDown, Minus, Save, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

const COLUMNS = ["Applied", "Interviewing", "Interview Scheduled", "Offer", "Rejected"];
const COLUMN_COLORS: Record<string, string> = {
  "Applied": "border-t-blue-500",
  "Interviewing": "border-t-amber-500",
  "Interview Scheduled": "border-t-emerald-500",
  "Offer": "border-t-green-400",
  "Rejected": "border-t-red-500/50",
};

export default function TrackerPage() {
  const [apps, setApps] = useState<ApplicationResponse[]>([]);
  const [jobs, setJobs] = useState<Record<number, JobListingResponse>>({});
  const [memories, setMemories] = useState<MemoryLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [pitchModal, setPitchModal] = useState<ApplicationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"pitch" | "resume">("pitch");
  const [editText, setEditText] = useState("");
  const [resumeEditText, setResumeEditText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingResume, setIsEditingResume] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [appData, jobData, memData] = await Promise.all([
        fetchApplications(), fetchJobMatches(), fetchMemoryLog(1),
      ]);
      setApps(appData);
      const jobMap: Record<number, JobListingResponse> = {};
      jobData.forEach(j => { jobMap[j.id] = j; });
      setJobs(jobMap);
      setMemories(memData.memories);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMemoryLog(1).then((data) => {
        setMemories(data.memories);
      }).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (appId: number, newColumn: string) => {
    toast.loading("Updating...", { id: `status-${appId}` });
    try {
      await updateKanbanStatus(appId, newColumn);
      toast.success(`Moved to ${newColumn}!`, { id: `status-${appId}` });
      if (newColumn === "Interview Scheduled") {
        toast("Hindsight: Memorizing successful pitch pattern...", {
          icon: "🎯", duration: 4000,
          style: { background: "#1a1a2e", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" },
        });
      }
      loadAll();
    } catch { toast.error("Update failed.", { id: `status-${appId}` }); }
  };

  const handleDraftPitch = async (app: ApplicationResponse) => {
    if (app.cold_email || app.cover_letter) {
      setPitchModal(app);
      setEditText(app.edited_email || app.cold_email || app.cover_letter || "");
      setResumeEditText(app.edited_resume || app.tailored_resume || "");
      setIsEditing(false);
      setIsEditingResume(false);
      setActiveTab("pitch");
      return;
    }
    toast.loading("Groq + Hindsight generating pitch & resume...", { id: `pitch-${app.id}` });
    try {
      const updated = await generatePitch(app.id);
      toast.success("Pitch & tailored resume ready!", { id: `pitch-${app.id}` });
      setPitchModal(updated);
      setEditText(updated.cold_email || updated.cover_letter || "");
      setResumeEditText(updated.edited_resume || updated.tailored_resume || "");
      setIsEditing(false);
      setIsEditingResume(false);
      setActiveTab("pitch");
      loadAll();
    } catch { toast.error("Generation failed.", { id: `pitch-${app.id}` }); }
  };

  const handleSavePitchEdit = async () => {
    if (!pitchModal) return;
    toast.loading("Saving & teaching agent...", { id: "save-edit" });
    try {
      const updated = await submitPitchEdit(pitchModal.id, editText);
      toast.success("Saved! Agent is learning from your edits...", { id: "save-edit" });
      toast("Hindsight: Learning your pitch style preferences...", {
        icon: "💡", duration: 4000,
        style: { background: "#1a1a2e", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" },
      });
      setPitchModal(updated);
      setIsEditing(false);
      loadAll();
    } catch { toast.error("Save failed.", { id: "save-edit" }); }
  };

  const handleSaveResumeEdit = async () => {
    if (!pitchModal) return;
    toast.loading("Saving resume & teaching agent...", { id: "save-resume" });
    try {
      const updated = await submitResumeEdit(pitchModal.id, resumeEditText);
      toast.success("Resume saved! Agent learning bullet-point preferences...", { id: "save-resume" });
      toast("Hindsight: Learning your resume phrasing style...", {
        icon: "📝", duration: 4000,
        style: { background: "#1a1a2e", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" },
      });
      setPitchModal(updated);
      setIsEditingResume(false);
      loadAll();
    } catch { toast.error("Save failed.", { id: "save-resume" }); }
  };

  const copyToClipboard = () => {
    const text = activeTab === "pitch"
      ? (pitchModal?.edited_email || pitchModal?.cold_email || pitchModal?.cover_letter || "")
      : (pitchModal?.edited_resume || pitchModal?.tailored_resume || "");
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const getMemoryIcon = (type: string) => {
    switch (type) {
      case "world": return "🌍"; case "experience": return "🎯";
      case "observation": return "💡"; case "opinion": return "💭"; default: return "🧠";
    }
  };
  const getMemoryBadge = (type: string) => {
    switch (type) {
      case "world": return "memory-badge-world"; case "experience": return "memory-badge-experience";
      case "observation": return "memory-badge-observation"; case "opinion": return "memory-badge-opinion";
      default: return "memory-badge-world";
    }
  };
  const getTrendIcon = (trend?: string) => {
    if (trend === "strengthening") return <TrendingUp size={10} className="text-emerald-400" />;
    if (trend === "weakening") return <TrendingDown size={10} className="text-red-400" />;
    return <Minus size={10} className="text-gray-500" />;
  };

  // Simple markdown renderer for resume preview
  const renderMarkdown = (md: string) => {
    const lines = md.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} className="resume-section-heading">{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} className="resume-subsection-heading">{line.slice(4)}</h3>;
      if (line.startsWith("- ")) {
        const bulletText = line.slice(2);
        const rendered = bulletText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        return <li key={i} className="resume-bullet" dangerouslySetInnerHTML={{ __html: rendered }} />;
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      const rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className="text-sm text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: rendered }} />;
    });
  };

  if (loading) return <div className="text-center mt-20 animate-pulse text-blue-400">Loading agent memory...</div>;

  return (
    <div className="animate-in fade-in duration-500 h-[calc(100vh-5rem)]">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Application Tracker</h1>
        <p className="mt-1 text-gray-400">Kanban board with real-time Hindsight memory learning.</p>
      </header>

      <div className="flex gap-6 h-[calc(100%-5rem)]">
        {/* KANBAN BOARD */}
        <div className="flex-[7] flex gap-3 overflow-x-auto hide-scrollbar">
          {COLUMNS.map((col) => {
            const colApps = apps.filter(a => (a.kanban_column || a.status) === col);
            return (
              <div key={col} className={`kanban-column flex-1 min-w-[200px] p-3 flex flex-col border-t-2 ${COLUMN_COLORS[col] || "border-t-gray-600"}`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-sm text-gray-300">{col}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 font-mono">{colApps.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2.5">
                  {colApps.map((app) => {
                    const job = jobs[app.job_id];
                    const hasLearned = app.edited_email && app.edited_email !== app.cold_email;
                    const hasResumeEdit = app.edited_resume && app.edited_resume !== app.tailored_resume;
                    return (
                      <div key={app.id} className={`kanban-card p-3.5 ${hasLearned || hasResumeEdit ? "learned" : ""}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-gray-200 truncate">{job?.title || `Job #${app.job_id}`}</p>
                            <p className="text-[11px] text-gray-500 truncate">{job?.company || "Unknown"}</p>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider shrink-0 ml-2 ${(app.match_score || 0) >= 70 ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-500"}`}>
                            {app.match_score ?? "—"}%
                          </span>
                        </div>
                        {(hasLearned || hasResumeEdit) && (
                          <div className="flex items-center gap-1 mb-2 text-[10px] text-amber-400/80">
                            <Brain size={10} /> Agent learned from {hasLearned && hasResumeEdit ? "edits" : hasLearned ? "pitch edit" : "resume edit"}
                          </div>
                        )}
                        {app.tailored_resume && (
                          <div className="flex items-center gap-1 mb-2 text-[10px] text-emerald-400/70">
                            <FileText size={10} /> Tailored resume ready
                          </div>
                        )}
                        <div className="flex gap-1.5 mt-2">
                          <select
                            className="flex-1 bg-black/40 border border-white/10 rounded text-[11px] py-1.5 px-2 outline-none focus:border-blue-500 transition-colors"
                            value={app.kanban_column || app.status}
                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          >
                            {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button
                            onClick={() => handleDraftPitch(app)}
                            className="flex items-center justify-center bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 w-8 h-8 rounded hover:bg-indigo-600 hover:text-white transition-colors"
                            title="Draft / View Pitch & Resume"
                          >
                            <PenTool size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {colApps.length === 0 && (
                    <div className="text-center p-4 text-[11px] text-gray-600 border border-dashed border-gray-700/50 rounded-lg">Drop cards here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* AGENT MEMORY LOG */}
        <div id="memory" className="flex-[3] min-w-[280px] max-w-[380px] glass-card p-4 flex flex-col border border-amber-500/10 animate-pulse-glow">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Brain size={18} className="text-amber-400" />
              <h3 className="font-bold text-sm">Agent Memory Log</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-amber-400/70 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full font-mono">{memories.length} memories</span>
              <button onClick={loadAll} className="text-gray-500 hover:text-gray-300 transition-colors" title="Refresh"><RefreshCw size={12} /></button>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Real-time feed of what Hindsight has learned about your preferences, style, and successful patterns.</p>
          <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2.5">
            {memories.length > 0 ? memories.map((mem, i) => (
              <div key={mem.id} className="memory-entry animate-slide-in-right animate-memory-glow p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-amber-500/20 transition-all" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${getMemoryBadge(mem.type)}`}>{getMemoryIcon(mem.type)} {mem.type}</span>
                  <div className="flex items-center gap-1.5">
                    {getTrendIcon(mem.trend)}
                    {mem.proof_count && mem.proof_count > 1 && <span className="text-[9px] text-gray-500 font-mono">{mem.proof_count}x</span>}
                  </div>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{mem.text}</p>
                <p className="text-[9px] text-gray-600 mt-1.5">{mem.created_at ? new Date(mem.created_at).toLocaleString() : "Just now"}</p>
              </div>
            )) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <Sparkles size={28} className="text-amber-400/20 mb-3" />
                <p className="text-sm text-gray-500 font-medium">No memories yet</p>
                <p className="text-[11px] text-gray-600 mt-1 max-w-[200px]">Upload a resume, apply to jobs, and edit pitches to start teaching the agent.</p>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-gray-600">
            <Sparkles size={10} className="text-amber-500/40" /> Powered by Vectorize Hindsight - Auto-refreshing
          </div>
        </div>
      </div>

      {/* ===== TABBED PITCH / RESUME MODAL ===== */}
      {pitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-3xl border border-white/10 shadow-2xl overflow-hidden relative">
            {/* Modal header with tabs */}
            <div className="border-b border-white/10 bg-white/5">
              <div className="p-4 flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2">
                  {activeTab === "pitch" ? <PenTool size={18} className="text-indigo-400" /> : <FileText size={18} className="text-emerald-400" />}
                  {activeTab === "pitch"
                    ? (isEditing ? "Edit & Teach Agent" : "AI-Generated Pitch")
                    : (isEditingResume ? "Edit Tailored Resume" : "AI-Tailored Resume")}
                  {(pitchModal.pitch_version || 0) > 1 && (
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                      v{pitchModal.pitch_version} - Memory-enhanced
                    </span>
                  )}
                </h2>
                <button onClick={() => { setPitchModal(null); setIsEditing(false); setIsEditingResume(false); }} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              {/* Tab bar */}
              <div className="flex px-4">
                <button
                  onClick={() => { setActiveTab("pitch"); setIsEditingResume(false); }}
                  className={`modal-tab ${activeTab === "pitch" ? "modal-tab-active" : "modal-tab-inactive"}`}
                >
                  <PenTool size={14} /> Cold Email Pitch
                </button>
                <button
                  onClick={() => { setActiveTab("resume"); setIsEditing(false); }}
                  className={`modal-tab ${activeTab === "resume" ? "modal-tab-active-resume" : "modal-tab-inactive"}`}
                >
                  <FileText size={14} /> Tailored Resume
                  {pitchModal.tailored_resume && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1.5" />}
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto hide-scrollbar">
              {activeTab === "pitch" ? (
                /* PITCH TAB */
                isEditing ? (
                  <div className="space-y-3">
                    <p className="text-xs text-amber-400/80 flex items-center gap-1.5"><Brain size={12} /> Your edits will be analyzed and stored in Hindsight memory</p>
                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
                      className="w-full h-[40vh] bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-gray-300 font-mono leading-relaxed resize-none outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                ) : (
                  <div className="bg-black/50 border border-white/5 p-4 rounded-xl text-sm leading-relaxed text-gray-300 font-mono whitespace-pre-wrap">
                    {pitchModal.edited_email || pitchModal.cold_email || pitchModal.cover_letter || "No pitch generated yet. Click Generate first."}
                  </div>
                )
              ) : (
                /* RESUME TAB */
                isEditingResume ? (
                  <div className="space-y-3">
                    <p className="text-xs text-emerald-400/80 flex items-center gap-1.5"><Brain size={12} /> Resume edits teach the agent your bullet-point phrasing preferences</p>
                    <textarea value={resumeEditText} onChange={(e) => setResumeEditText(e.target.value)}
                      className="w-full h-[40vh] bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-gray-300 font-mono leading-relaxed resize-none outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                ) : (
                  <div className="resume-markdown bg-black/50 border border-white/5 p-6 rounded-xl">
                    {pitchModal.tailored_resume ? (
                      renderMarkdown(pitchModal.edited_resume || pitchModal.tailored_resume)
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <FileText size={32} className="mx-auto mb-3 text-gray-600" />
                        <p className="text-sm">No tailored resume yet.</p>
                        <p className="text-xs mt-1 text-gray-600">Generate a pitch first — the resume will be created alongside it.</p>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t border-white/10 flex justify-between items-center bg-white/5">
              <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <Brain size={10} className="text-amber-400/50" />
                {activeTab === "pitch"
                  ? (isEditing ? "Pitch changes will train the agent" : "Click Edit to teach the agent your style")
                  : (isEditingResume ? "Resume changes will train bullet-point phrasing" : "Click Edit to teach the agent your resume style")}
              </div>
              <div className="flex gap-2">
                {activeTab === "pitch" ? (
                  isEditing ? (
                    <>
                      <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
                      <button onClick={handleSavePitchEdit} className="px-4 py-2 rounded text-sm text-white bg-amber-600 hover:bg-amber-500 transition-colors flex items-center gap-2"><Save size={14} /> Save & Teach Agent</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setIsEditing(true); setEditText(pitchModal.edited_email || pitchModal.cold_email || pitchModal.cover_letter || ""); }} className="px-4 py-2 rounded text-sm text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-all flex items-center gap-2"><PenTool size={14} /> Edit Pitch</button>
                      <button onClick={copyToClipboard} className="px-4 py-2 rounded text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center gap-2"><Copy size={14} /> Copy</button>
                    </>
                  )
                ) : (
                  isEditingResume ? (
                    <>
                      <button onClick={() => setIsEditingResume(false)} className="px-4 py-2 rounded text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
                      <button onClick={handleSaveResumeEdit} className="px-4 py-2 rounded text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center gap-2"><Save size={14} /> Save & Teach Agent</button>
                    </>
                  ) : (
                    <>
                      {pitchModal.tailored_resume && (
                        <button onClick={() => { setIsEditingResume(true); setResumeEditText(pitchModal.edited_resume || pitchModal.tailored_resume || ""); }} className="px-4 py-2 rounded text-sm text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all flex items-center gap-2"><PenTool size={14} /> Edit Resume</button>
                      )}
                      <button onClick={copyToClipboard} className="px-4 py-2 rounded text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center gap-2"><Copy size={14} /> Copy</button>
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
