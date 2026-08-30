import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "api-sync | API Documentation Drift Engine",
  description: "Detect API documentation drift in GitHub pull requests, understand what changed, and sync reviewable fixes back to your PR branch.",
  openGraph: {
    title: "api-sync | API Documentation Drift Engine",
    description: "Automated API documentation drift detection, SkillPatch generation, and GitHub PR synchronization.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f6f5f2] text-[#141413] selection:bg-[#ff6b00]/15 selection:text-[#ea580c] font-sans">
        <div className="fixed inset-0 bg-[radial-gradient(#e5e3dc_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none z-0" />
        <div className="relative z-10 flex flex-col flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
