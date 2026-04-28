"use client";

// Redirect /signup to unified /login page (signup mode is built-in)
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/login"); }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
      <p className="text-gray-500 animate-pulse">Redirecting...</p>
    </div>
  );
}
