"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { Loader2, Mail, Lock, User, Eye, EyeOff, Sparkles } from "lucide-react";
import { auth, googleProvider, isConfigured } from "@/lib/firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import api, { loginUser, registerUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // ---- Backend sync for Firebase users ----
  const syncWithBackend = async (idToken: string, displayName?: string | null) => {
    try {
      await api.post("/api/auth/verify", null, {
        headers: { Authorization: `Bearer ${idToken}` },
        params: displayName ? { full_name: displayName } : {},
      });
    } catch (err) {
      console.warn("Backend sync failed (non-blocking):", err);
    }
  };

  // ---- Google SSO (only if Firebase is configured) ----
  const handleGoogle = async () => {
    if (!isConfigured || !auth || !googleProvider || !signInWithPopup) {
      setError("Firebase is not configured. Add your Firebase keys to .env.local to enable Google Sign-In.");
      return;
    }
    setGoogleLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await syncWithBackend(idToken, result.user.displayName);
      toast.success(`Welcome, ${result.user.displayName || "Agent"}!`);
      router.push("/tracker");
    } catch (err: any) {
      const msg = firebaseErrorMessage(err.code);
      setError(msg);
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // ---- Email/Password auth ----
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      // If Firebase is configured, use Firebase Auth
      if (isConfigured && auth && signInWithEmailAndPassword && createUserWithEmailAndPassword) {
        let userCredential;
        if (mode === "signup") {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (fullName && updateProfile) {
            await updateProfile(userCredential.user, { displayName: fullName });
          }
        } else {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        }
        const idToken = await userCredential.user.getIdToken();
        await syncWithBackend(idToken, fullName || userCredential.user.displayName);
      } else {
        // Fallback: use existing backend auth directly
        if (mode === "signup") {
          await registerUser({ email, password, full_name: fullName });
        } else {
          await loginUser({ email, password });
        }
      }

      toast.success(mode === "signup" ? "Account created! Welcome aboard." : "Welcome back!");
      router.push("/tracker");
    } catch (err: any) {
      // Handle Firebase errors or backend errors
      const msg = err.code
        ? firebaseErrorMessage(err.code)
        : (err.response?.data?.detail || "Authentication failed. Please try again.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const firebaseErrorMessage = (code: string): string => {
    switch (code) {
      case "auth/email-already-in-use": return "This email is already registered. Try signing in.";
      case "auth/invalid-email": return "Please enter a valid email address.";
      case "auth/user-not-found": return "No account found with this email.";
      case "auth/wrong-password": return "Incorrect password. Please try again.";
      case "auth/invalid-credential": return "Invalid credentials. Check your email and password.";
      case "auth/weak-password": return "Password is too weak. Use at least 6 characters.";
      case "auth/popup-closed-by-user": return "Google sign-in was cancelled.";
      case "auth/too-many-requests": return "Too many attempts. Please wait a moment.";
      case "auth/network-request-failed": return "Network error. Check your connection.";
      default: return "Authentication failed. Please try again.";
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{ background: "#0a0a0f" }}>

      {/* Ambient background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/12 blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-indigo-500/8 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[1100px] mx-auto flex rounded-2xl overflow-hidden relative z-10 m-4">

        {/* ===== LEFT: AUTH CARD ===== */}
        <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[420px] relative">
            <div className="relative rounded-2xl p-8 sm:p-10 overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}>

              {/* Corner glow */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />

              {/* Branding */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-white">AutoApply AI</h1>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Hindsight-Powered</p>
                </div>
              </div>

              {/* Header */}
              <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-sm text-gray-400 mb-7">
                {mode === "login"
                  ? "Sign in to continue your AI-powered job search."
                  : "Deploy your career agent in under 30 seconds."}
              </p>

              {/* ---- Google SSO Button ---- */}
              <button
                id="google-sso-btn"
                onClick={handleGoogle}
                disabled={googleLoading || loading}
                className="w-full py-3 rounded-xl font-semibold text-[14px] text-white flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {googleLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                )}
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </button>

              {/* ---- Divider ---- */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">or continue with email</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>

              {/* ---- Email/Password Form ---- */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {mode === "signup" && (
                  <div className="relative animate-in slide-in-from-top-2 duration-300">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input id="full-name-input" type="text" placeholder="Full name" value={fullName}
                      onChange={(e) => setFullName(e.target.value)} className="auth-input pl-10" />
                  </div>
                )}

                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input id="email-input" type="email" required placeholder="agent@company.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} className="auth-input pl-10" />
                </div>

                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input id="password-input" type={showPassword ? "text" : "password"} required placeholder="Password"
                    value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {mode === "signup" && (
                  <div className="relative animate-in slide-in-from-top-2 duration-300">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input id="confirm-password-input" type="password" required placeholder="Confirm password"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="auth-input pl-10" />
                  </div>
                )}

                {error && (
                  <div className="px-4 py-2.5 rounded-lg text-[13px] text-red-400 animate-in fade-in duration-200"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    {error}
                  </div>
                )}

                <button id="email-auth-btn" type="submit" disabled={loading || googleLoading}
                  className="w-full py-3 rounded-xl font-bold text-[14px] text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={{
                    background: mode === "login"
                      ? "linear-gradient(135deg, #2563eb, #4f46e5)"
                      : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    boxShadow: mode === "login"
                      ? "0 0 24px rgba(37,99,235,0.3)"
                      : "0 0 24px rgba(79,70,229,0.3)",
                  }}
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> {mode === "login" ? "Signing in..." : "Creating account..."}</>
                  ) : (
                    mode === "login" ? "Sign In" : "Create Account"
                  )}
                </button>
              </form>

              {/* Toggle mode */}
              <p className="mt-7 text-center text-[13px] text-gray-500">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button onClick={toggleMode}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  {mode === "login" ? "Create one" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* ===== RIGHT: HERO GRAPHIC ===== */}
        <div className="hidden lg:flex w-[45%] items-center justify-center p-8 relative">
          <div className="absolute inset-0 rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, rgba(30,58,138,0.15), rgba(0,0,0,0) 60%, rgba(79,70,229,0.1))",
              border: "1px solid rgba(255,255,255,0.04)",
            }}>
            <div className="absolute top-[20%] left-[30%] w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-[25%] right-[20%] w-72 h-72 bg-purple-600/15 rounded-full blur-[90px] animate-pulse" style={{ animationDelay: "1.5s" }} />

            <div className="h-full w-full flex items-center justify-center flex-col relative z-10 text-center px-8">
              <div className="relative w-56 h-56 mb-8 hover:scale-105 transition-transform duration-700 ease-in-out">
                <Image src="/agent_orb.png" alt="AI Intelligence Core" fill
                  className="object-contain animate-float drop-shadow-[0_0_60px_rgba(59,130,246,0.5)]"
                  priority />
              </div>

              <h3 className="text-2xl font-bold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                Your Career, Automated.
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                An AI agent that learns your style, tailors every resume,
                and writes pitches that land interviews.
              </p>

              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {["Hindsight Memory", "Resume Tailoring", "Smart Pitches"].map((f) => (
                  <span key={f} className="px-3 py-1 text-[11px] font-medium rounded-full text-indigo-300"
                    style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
