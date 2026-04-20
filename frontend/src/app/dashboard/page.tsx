"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, FileText, Activity, Zap } from "lucide-react";
import { fetchActivity, ActivityItem } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchActivity().then(setActivities).catch(() => {});
  }, []);

  const handleActivityClick = (item: ActivityItem) => {
    if (item.type === "resume") {
      router.push("/resume-analyzer");
    } else if (item.type === "application") {
      router.push("/tracker");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-gray-400">Welcome back. Here is your career agent status.</p>
      </header>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Resumes", val: "3", icon: <FileText size={20}/>, color: "text-blue-400" },
          { title: "Average ATS", val: "78%", icon: <Zap size={20}/>, color: "text-emerald-400" },
          { title: "Active Apps", val: "12", icon: <Activity size={20}/>, color: "text-indigo-400" },
          { title: "Smart Matches", val: "4", icon: <LayoutDashboard size={20}/>, color: "text-purple-400" },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-400">{stat.title}</p>
              <div className={`${stat.color} bg-white/5 p-2 rounded-lg`}>{stat.icon}</div>
            </div>
            <h3 className="text-3xl font-bold">{stat.val}</h3>
          </div>
        ))}
      </div>

      {/* RECENT ACTIVITY */}
      <section className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Activity size={20} className="text-blue-400"/> Recent Activity
        </h2>
        <div className="space-y-4">
          {activities.length > 0 ? activities.map((item, i) => {
            // Colors: Blue for Resumes, Yellow for Applications, Green for Offers
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
            <div className="text-center p-6 text-gray-500 italic bg-white/5 rounded-xl border border-dashed border-white/10">No recent activity detected in database.</div>
          )}
        </div>
      </section>
    </div>
  );
}
