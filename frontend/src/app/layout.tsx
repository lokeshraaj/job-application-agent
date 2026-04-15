import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: "AutoApply AI - Agentic Job Outreach",
  description: "An autonomous agent that finds job openings and sends personalized cold emails using Hindsight memory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-white`}>
        <div className="fixed inset-0 -z-10 h-full w-full bg-[#0f172a]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_200%_100%_at_top,#1e293b,transparent)]"></div>
        </div>
        {children}
      </body>
    </html>
  );
}
