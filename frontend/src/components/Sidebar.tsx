"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Briefcase, Activity } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  // Hide sidebar on auth routes
  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <aside className="w-full md:w-64 glass-card md:h-screen md:sticky top-0 p-6 flex flex-col md:border-y-0 md:border-l-0 md:rounded-none">
      <div className="flex items-center space-x-3 mb-10">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
        <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">AI JOB AGENT</h1>
      </div>
      
      <nav className="flex-1 space-y-2">
        <Link href="/dashboard" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
          <LayoutDashboard size={20} className="text-blue-400 group-hover:text-blue-300" />
          <span className="font-medium">Dashboard</span>
        </Link>
        <Link href="/resume-analyzer" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
          <FileText size={20} className="text-indigo-400 group-hover:text-indigo-300" />
          <span className="font-medium">Resume Analyzer</span>
        </Link>
        <Link href="/job-matches" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
          <Briefcase size={20} className="text-purple-400 group-hover:text-purple-300" />
          <span className="font-medium">Job Matches</span>
        </Link>
        <Link href="/tracker" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
          <Activity size={20} className="text-pink-400 group-hover:text-pink-300" />
          <span className="font-medium">App Tracker</span>
        </Link>
      </nav>
    </aside>
  );
}
