import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';
import { Analytics } from "@vercel/analytics/react";
import { PostHogProvider } from "@/providers/PostHogProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoApply AI — Hindsight-Powered Career Agent",
  description: "AI-powered career automation platform for experienced software engineers. Uses Vectorize Hindsight memory to learn from your edits and improve over time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col md:flex-row text-gray-100 selection:bg-indigo-500/30">
        
        {/* POSTHOG TELEMETRY WRAPPER */}
        <PostHogProvider>
            {/* SIDEBAR NAVIGATION */}
            <Sidebar />

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 p-6 md:p-10 hide-scrollbar overflow-x-hidden relative">
              <Toaster position="bottom-right" toastOptions={{ style: { background: '#171717', color: '#fff', border: '1px solid #333' } }} />
              {children}
            </main>
        </PostHogProvider>

        {/* VERCEL END-OF-BODY ANALYTICS */}
        <Analytics />
      </body>
    </html>
  );
}
