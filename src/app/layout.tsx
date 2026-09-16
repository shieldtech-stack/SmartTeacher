import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layouts/app-shell";
import { AuthProvider } from "@/lib/auth/context";

export const metadata: Metadata = {
  title: "SmartTeacher",
  description:
    "AI-powered Schemes of Work, Lesson Plans, and Notes for teachers. Upload textbooks, align to curriculum, and generate instantly.",
  applicationName: "SmartTeacher",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}