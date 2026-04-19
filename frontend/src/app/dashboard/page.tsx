"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, FileText, Activity, Zap, Brain, TrendingUp, Sparkles } from "lucide-react";
import { fetchActivity, fetchMemoryLog, fetchPreferences, ActivityItem, MemoryLogItem } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [memories, setMemories] = useState<MemoryLogItem[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [preferences, setPreferences] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchActivity().then(setActivities).catch(() => {});
    fetchMemoryLog(1).then((data) => {
      setMemories(data.memories.slice(0, 3));
      setMemoryCount(data.total);
    }).catch(() => {});
    fetchPreferences(1).then((data) => {
      setPreferences(data.preferences);
    }).catch(() => {});
  }, []);

  const handleActivityClick = (item: ActivityItem) => {
    if (item.type === "resume") {
      router.push("/resume-analyzer");
    } else if (item.type === "application") {
      router.push("/tracker");
    }
  };

  const getMemoryIcon = (type: string) => {
    switch (type) {
      case "world": return "🌍";
      case "experience": return "🎯";
      case "observation": return "💡";
      case "opinion": return "💭";
      default: return "🧠";
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case "strengthening": return "text-emerald-400";
      case "weakening": return "text-red-400";
      case "stale": return "text-gray-500";
      default: return "text-amber-400";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="mt-1 text-gray-400">Your Hindsight-powered career agent status at a glance.</p>
      </header>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Resumes", val: "3", icon: <FileText size={20}/>, color: "text-blue-400", glow: "shadow-blue-500/10" },
          { title: "Average ATS", val: "78%", icon: <Zap size={20}/>, color: "text-emerald-400", glow: "shadow-emerald-500/10" },
          { title: "Agent Memories", val: String(memoryCount), icon: <Brain size={20}/>, color: "text-amber-400", glow: "shadow-amber-500/10" },
          { title: "Active Apps", val: String(activities.filter(a => a.type === "application").length || 12), icon: <Activity size={20}/>, color: "text-indigo-400", glow: "shadow-indigo-500/10" },
        ].map((stat, i) => (
          <div key={i} className={`glass-card p-6 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 shadow-lg ${stat.glow}`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-400">{stat.title}</p>
              <div className={`${stat.color} bg-white/5 p-2 rounded-lg`}>{stat.icon}</div>
            </div>
            <h3 className="text-3xl font-bold">{stat.val}</h3>
            {stat.title === "Agent Memories" && (
              <p className="text-xs text-amber-400/60 mt-1 flex items-center gap-1">
                <TrendingUp size={10} /> Learning from your interactions
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* RECENT ACTIVITY */}
        <section className="glass-card p-6 lg:col-span-3">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Activity size={20} className="text-blue-400"/> Recent Activity
          </h2>
          <div className="space-y-3">
            {activities.length > 0 ? activities.map((item, i) => {
              let pipColor = "bg-gray-500 shadow-gray-500/20";
              if (item.type === "resume") pipColor = "bg-blue-400 shadow-blue-400/30";
              else if (item.status === "Offer") pipColor = "bg-emerald-400 shadow-emerald-400/30";
              else if (item.type === "application") pipColor = "bg-yellow-400 shadow-yellow-400/30";

              return (
                <div
                  key={i}
                  onClick={() => handleActivityClick(item)}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full shadow-[0_0_8px] ${pipColor}`} />
                    <div>
                      <p className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors">{item.tag}: {item.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : "Just now"}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    item.status === 'Pending' ? 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10' :
                    item.status === 'Offer' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' :
                    'text-blue-300 border-blue-400/20 bg-blue-400/10'
                  }`}>
                    {item.status}
                  </span>
                </div>
              );
            }) : (
              <div className="text-center p-8 text-gray-500 italic bg-white/5 rounded-xl border border-dashed border-white/10">
                No recent activity. Upload a resume to get started.
              </div>
            )}
          </div>
        </section>

        {/* HINDSIGHT MEMORY PREVIEW */}
        <section className="glass-card p-6 lg:col-span-2 flex flex-col animate-pulse-glow" id="memory-preview">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain size={18} className="text-amber-400"/>
            <span>Agent Memory</span>
            <span className="ml-auto text-xs text-amber-400/60 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full font-mono">
              {memoryCount} learned
            </span>
          </h2>

          <div className="flex-1 space-y-3">
            {memories.length > 0 ? memories.map((mem, i) => (
              <div
                key={mem.id}
                className="p-3 rounded-lg bg-white/5 border border-white/5 text-sm animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base shrink-0 mt-0.5">{getMemoryIcon(mem.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 line-clamp-2 leading-relaxed">{mem.text}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${getTrendColor(mem.trend)}`}>
                        {mem.trend || "stable"}
                      </span>
                      {mem.proof_count && mem.proof_count > 1 && (
                        <span className="text-[10px] text-gray-500">
                          {mem.proof_count} evidence
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <Sparkles size={24} className="text-amber-400/30 mb-3" />
                <p className="text-sm">No memories yet.</p>
                <p className="text-xs text-gray-600 mt-1">Upload a resume and edit pitches to teach the agent.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push("/tracker#memory")}
            className="mt-4 text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 group"
          >
            View Full Memory Log
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </section>
      </div>
    </div>
  );
}
