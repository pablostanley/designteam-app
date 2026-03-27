import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
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
  title: "Design Team — Assemble Your AI Design Crew",
  description:
    "Build a team of specialized AI agents for design work. Each agent has a role, personality, and expertise. Export as skill files for Claude Code, Cursor, or any AI tool.",
  metadataBase: new URL("https://designteam.app"),
  openGraph: {
    title: "Design Team — Assemble Your AI Design Crew",
    description:
      "Build a team of specialized AI agents for design work.",
    url: "https://designteam.app",
    siteName: "Design Team",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Design Team — Assemble Your AI Design Crew",
    description:
      "Build a team of specialized AI agents for design work.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
