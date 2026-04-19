"use client";

import { useState, useEffect } from "react";
import { fetchJobMatches, quickApply, JobListingResponse } from "@/lib/api";
import { Briefcase, MapPin, Zap, Building, Navigation, DollarSign, Brain } from "lucide-react";
import toast from "react-hot-toast";

export default function JobMatchesPage() {
  const [jobs, setJobs] = useState<JobListingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingTo, setApplyingTo] = useState<number | null>(null);

  useEffect(() => {
    fetchJobMatches().then(setJobs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleApply = async (jobId: number) => {
    setApplyingTo(jobId);
    toast.loading("AI analyzing fit...", { id: `apply-${jobId}` });
    try {
      const app = await quickApply(1, jobId);
      toast.success(`Applied! Score: ${app.match_score ?? 0}%`, { id: `apply-${jobId}` });
    } catch {
      toast.error("Apply failed.", { id: `apply-${jobId}` });
    } finally { setApplyingTo(null); }
  };

  const seniorityColor = (l?: string) => {
    if (l === "Principal") return "text-amber-300 bg-amber-500/15 border-amber-500/30";
    if (l === "Staff") return "text-purple-300 bg-purple-500/15 border-purple-500/30";
    return "text-blue-300 bg-blue-500/15 border-blue-500/30";
  };

  if (loading) return <div className="text-center mt-20 text-blue-400 animate-pulse">Loading...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Job Matches</h1>
        <p className="mt-1 text-gray-400">Curated roles for experienced engineers, ranked by your skill profile.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobs.map((job) => (
          <div key={job.id} className="glass-card p-6 flex flex-col justify-between hover:border-indigo-500/30 transition-all border border-white/5 group">
            <div>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-gray-100">{job.title}</h3>
                {job.seniority_level && (
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 ml-3 ${seniorityColor(job.seniority_level)}`}>
                    {job.seniority_level}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-sm text-gray-400">
                <div className="flex items-center gap-1.5"><Building size={14}/><span className="font-medium">{job.company}</span></div>
                <div className="flex items-center gap-1.5"><MapPin size={14}/><span>{job.location || "Remote"}</span></div>
                {job.salary_range && (
                  <div className="flex items-center gap-1.5"><DollarSign size={14} className="text-emerald-500"/><span className="text-emerald-400 font-semibold">{job.salary_range}</span></div>
                )}
              </div>
              <p className="text-sm text-gray-400 line-clamp-3 mb-4 leading-relaxed">{job.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {job.required_skills.split(",").slice(0, 5).map((s, i) => (
                  <span key={i} className="px-2 py-0.5 text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md">{s.trim()}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-4">
                <Brain size={14} className="text-amber-400 shrink-0"/>
                <span className="text-xs text-amber-300/80"><span className="font-semibold text-amber-400">Memory-Enhanced</span> — Pitch & resume tailored by learned preferences</span>
              </div>
            </div>
            <button onClick={() => handleApply(job.id)} disabled={applyingTo === job.id}
              className="w-full py-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 font-medium rounded-lg hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2">
              {applyingTo === job.id ? <><Navigation className="animate-spin" size={18}/>Analyzing...</> : <><Briefcase size={18}/>Quick Apply (AI)</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
