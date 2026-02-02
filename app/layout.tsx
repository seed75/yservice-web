import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppBackground from "@/components/AppBackground";
import AuthGate from "@/components/AuthGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Simple Weekly Timesheets",
  description: "Owner-only timesheet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppBackground /> {/* ✅ 잔상 방지용 고정 배경 레이어 */}

        {/* ✅ 여기만 추가: 로그인/권한 게이트 */}
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
