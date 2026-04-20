"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Target, ArrowRight } from "lucide-react";
import { registerUser } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", full_name: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    toast.loading("Compiling Identity...", { id: "signup" });
    try {
      await registerUser(formData);
      toast.success("Identity Configured! Redirecting...", { id: "signup" });
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Registration failed", { id: "signup" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-[calc(100vh-5rem)]">
      {/* LEFT PANEL - FORM */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md glass-card p-8 md:p-10 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[60px]"></div>
          
          <h2 className="text-3xl font-bold mb-2 tracking-tight">Deploy Agent</h2>
          <p className="text-gray-400 text-sm mb-8">Establish your base protocol to begin automation.</p>
          
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
              <input 
                type="text" 
                required
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors" 
                placeholder="Ada Lovelace"
                value={formData.full_name}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <input 
                type="email" 
                required
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors" 
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
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors" 
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50"
            >
              {loading ? "Configuring Agent..." : "Construct Profile"}
              <ArrowRight size={18} />
            </button>
            
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink-0 mx-4 text-gray-500 text-xs text-uppercase">or</span>
                <div className="flex-grow border-t border-white/5"></div>
            </div>
            
            <button type="button" className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors border border-white/5">
              <Target size={18} className="text-indigo-400" />
              Continue with Google
            </button>
          </form>
          
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an active instance? <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">Authenticate here</Link>
          </p>
        </div>
      </div>
      
      {/* RIGHT PANEL - GRAPHIC */}
      <div className="hidden md:flex w-1/2 items-center justify-center p-12 overflow-hidden relative">
         <div className="absolute inset-0 bg-gradient-to-bl from-purple-900/20 to-black rounded-3xl border border-white/5 overflow-hidden">
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px] animate-pulse"></div>
            
            <div className="h-full w-full flex items-center justify-center flex-col relative z-10 text-center">
                 <div className="w-24 h-24 border-4 border-indigo-500/50 rounded-full flex items-center justify-center mb-8 relative">
                    <div className="w-16 h-16 border-2 border-purple-400/50 rounded-full animate-spin"></div>
                    <div className="w-4 h-4 bg-white rounded-full absolute shadow-[0_0_15px_#fff]"></div>
                 </div>
                 <h3 className="text-2xl font-bold tracking-tight text-white mb-4">Initialize the Future.</h3>
                 <p className="text-gray-400 max-w-sm">
                   A neural network tailored to your resume, finding exact matches and orchestrating applications while you sleep.
                 </p>
            </div>
         </div>
      </div>
    </div>
  );
}
