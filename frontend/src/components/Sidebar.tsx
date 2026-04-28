"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, Briefcase, Activity, Brain, Sparkles, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide sidebar on auth routes
  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  const handleLogout = async () => {
    try {
      // Sign out from Firebase (if configured)
      if (auth) {
        await signOut(auth);
      }
      toast.success("Signed out successfully.");
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      // Redirect anyway
      router.push("/login");
    }
  };

  const navItems = [
    { href: "/dashboard",       label: "Dashboard",       icon: LayoutDashboard, color: "text-blue-400",   hoverColor: "group-hover:text-blue-300" },
    { href: "/resume-analyzer", label: "Resume Analyzer", icon: FileText,        color: "text-indigo-400", hoverColor: "group-hover:text-indigo-300" },
    { href: "/job-matches",     label: "Job Matches",     icon: Briefcase,       color: "text-purple-400", hoverColor: "group-hover:text-purple-300" },
    { href: "/tracker",         label: "App Tracker",     icon: Activity,        color: "text-pink-400",   hoverColor: "group-hover:text-pink-300" },
    { href: "/tracker#memory",  label: "Agent Memory",    icon: Brain,           color: "text-amber-400",  hoverColor: "group-hover:text-amber-300" },
  ];

  return (
    <aside className="w-full md:w-64 glass-card md:h-screen md:sticky top-0 p-6 flex flex-col md:border-y-0 md:border-l-0 md:rounded-none">
      {/* Branding */}
      <div className="flex items-center space-x-3 mb-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
            AutoApply AI
          </h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Hindsight-Powered</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/tracker#memory' && pathname === '/tracker');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all group relative ${
                isActive && item.href !== '/tracker#memory'
                  ? 'bg-white/10 border border-white/10'
                  : 'hover:bg-white/5'
              }`}
            >
              <Icon size={18} className={`${item.color} ${item.hoverColor} transition-colors`} />
              <span className="font-medium text-sm">{item.label}</span>
              {item.label === "Agent Memory" && (
                <span className="ml-auto relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer with Logout */}
      <div className="mt-auto pt-6 border-t border-white/5 space-y-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all group hover:bg-red-500/10 text-gray-400 hover:text-red-400"
        >
          <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
          <span className="font-medium text-sm">Sign Out</span>
        </button>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <Brain size={12} className="text-amber-500/60" />
          <span>Powered by Vectorize Hindsight</span>
        </div>
      </div>
    </aside>
  );
}
