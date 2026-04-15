"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Send, Clock, AlertCircle, CheckCircle2, History, Bot, Sparkles, User, Building, FileText, BrainCircuit } from "lucide-react";

export default function Home() {
  const [formData, setFormData] = useState({
    candidateName: "Alex Developer",
    targetRole: "Senior Frontend Engineer",
    companyName: "TechCorp Inc.",
    hrName: "Sarah Jenkins",
    jobDescription: "We are looking for a Senior Frontend Engineer proficient in React, Next.js, and modern CSS. You will lead our frontend architecture and mentor junior developers.",
    resumeText: "Experienced Frontend Engineer with 5+ years building scalable web apps using React and Next.js. Passionate about UI/UX and performance."
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "skipped" | "error" | null, message: string }>({ type: null, message: "" });
  const [logs, setLogs] = useState<any[]>([]);

  const fetchLogs = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/logs");
      if (res.data && res.data.logs) {
        setLogs(res.data.logs);
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ type: null, message: "" });

    try {
      const response = await axios.post("http://localhost:8000/api/apply", formData);
      setFeedback({
        type: response.data.status === "skipped" ? "skipped" : "success",
        message: response.data.message
      });
      // Re-fetch logs to show the new memory event
      setTimeout(fetchLogs, 1000);
    } catch (error: any) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.detail || error.message || "Failed to process application."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-6 py-12 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-12 animate-fade-in-down">
        <div className="p-3 bg-primary/20 text-primary rounded-2xl border border-primary/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          <Bot size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
            AutoApply AI
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <BrainCircuit size={16} /> Empowered by Groq & Hindsight Memory Context
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 glass rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:shadow-primary/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold flex items-center gap-2 text-white">
              <Sparkles size={24} className="text-blue-400" />
              New Outreach Mission
            </h2>
          </div>

          <form onSubmit={handleApply} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2 group">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <User size={16} /> Candidate Name
                </label>
                <input
                  type="text"
                  name="candidateName"
                  value={formData.candidateName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner group-hover:bg-slate-800 transition-colors"
                  required
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <FileText size={16} /> Resume Summary
                </label>
                <input
                  type="text"
                  name="resumeText"
                  value={formData.resumeText}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner group-hover:bg-slate-800"
                  required
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Building size={16} /> Company Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner group-hover:bg-slate-800"
                  required
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-sm font-medium text-slate-300">Target Role</label>
                <input
                  type="text"
                  name="targetRole"
                  value={formData.targetRole}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner group-hover:bg-slate-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-sm font-medium text-slate-300">HR Contact Name</label>
              <input
                type="text"
                name="hrName"
                value={formData.hrName}
                onChange={handleInputChange}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner group-hover:bg-slate-800"
                required
              />
            </div>

            <div className="space-y-2 group">
              <label className="text-sm font-medium text-slate-300">Job Description Snippet</label>
              <textarea
                name="jobDescription"
                value={formData.jobDescription}
                onChange={handleInputChange}
                rows={4}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner resize-none group-hover:bg-slate-800"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(59,130,246,0.4)]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Mission...
                </>
              ) : (
                <>
                  <Send size={20} /> Deploy Autonomous Agent
                </>
              )}
            </button>
          </form>

          {feedback.type && (
            <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 border ${
              feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
              feedback.type === 'skipped' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
              'bg-rose-500/10 border-rose-500/30 text-rose-400'
            } animate-fade-in-up`}>
              {feedback.type === 'success' && <CheckCircle2 size={24} className="shrink-0" />}
              {feedback.type === 'skipped' && <AlertCircle size={24} className="shrink-0" />}
              {feedback.type === 'error' && <AlertCircle size={24} className="shrink-0" />}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Right Column: Logs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass rounded-3xl p-8 shadow-xl flex flex-col h-[700px]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/50">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
                <History className="text-indigo-400" /> Agent Memory Bank
              </h3>
              <button 
                onClick={fetchLogs}
                className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-800"
                title="Refresh Logs"
              >
                <Clock size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-3">
                  <BrainCircuit size={48} className="opacity-20" />
                  <p>Memory bank is currently empty.</p>
                  <p className="text-sm">Deploy the agent to start building experience.</p>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={log.id || i} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg shrink-0 mt-1">
                        {log.type === "experience" || log.type === "world" ? <Sparkles size={16} /> : <FileText size={16} />}
                      </div>
                      <div>
                        <p className="text-slate-200 leading-relaxed text-sm">{log.content}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-900 px-2 py-1 rounded-md">
                            {log.type || "MEMORY"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 20px;
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.6s ease-out;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out;
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
