"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { LogIn, ArrowRight } from "lucide-react";
import { loginUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    toast.loading("Authenticating...", { id: "login" });
    try {
      await loginUser(formData);
      toast.success("Welcome back!", { id: "login" });
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid credentials", { id: "login" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-[calc(100vh-5rem)]">
      {/* LEFT PANEL - FORM */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md glass-card p-8 md:p-10 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[60px]"></div>
          
          <h2 className="text-3xl font-bold mb-2 tracking-tight">Welcome Back</h2>
          <p className="text-gray-400 text-sm mb-8">Sign in to sync your AI-job hunting agent.</p>
          
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <input 
                type="email" 
                required
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors" 
                placeholder="agent@antigravity.ai"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password" 
                required
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors" 
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50"
            >
              {loading ? "Decrypting Core..." : "Sign In"}
              <ArrowRight size={18} />
            </button>
            
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink-0 mx-4 text-gray-500 text-xs text-uppercase">or</span>
                <div className="flex-grow border-t border-white/5"></div>
            </div>
            
            <button type="button" className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors border border-white/5">
              <LogIn size={18} className="text-blue-400" />
              Continue with Google
            </button>
          </form>
          
          <p className="mt-8 text-center text-sm text-gray-500">
            Don't have an agent identity? <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-semibold">Initialize One</Link>
          </p>
        </div>
      </div>
      
      {/* RIGHT PANEL - GRAPHIC */}
      <div className="hidden md:flex w-1/2 items-center justify-center p-12 overflow-hidden relative">
         <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-black to-blue-900/10 rounded-3xl border border-white/5 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
            
            <div className="h-full w-full flex items-center justify-center flex-col relative z-10 text-center">
                 <div className="relative w-64 h-64 mb-6 hover:scale-105 transition-transform duration-700 ease-in-out">
                    <Image 
                       src="/agent_orb.png" 
                       alt="AI Intelligence Core" 
                       fill
                       className="object-contain animate-float drop-shadow-[0_0_50px_rgba(59,130,246,0.6)]"
                       style={{ width: 'auto', height: 'auto' }}
                       priority
                    />
                 </div>
                 <h3 className="text-3xl font-bold tracking-tight text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">Autonomy Encoded.</h3>
                 <p className="text-gray-400 max-w-sm">
                   Give your career search over to the agent. It learns from rejections, maps your skills, and automates outreach.
                 </p>
            </div>
         </div>
      </div>
    </div>
  );
}
