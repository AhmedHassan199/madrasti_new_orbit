import type { Metadata } from "next";
import { Tajawal, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { UiProvider } from "@/contexts/UiContext";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-tajawal",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "CORBIT SMOS — نظام المدرسة",
  description: "نظام إدارة المدرسة",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.variable} ${plexMono.variable}`} suppressHydrationWarning>
        <UiProvider>
          <AuthProvider>{children}</AuthProvider>
        </UiProvider>
      </body>
    </html>
  );
}
