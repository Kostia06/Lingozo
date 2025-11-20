import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata = {
  metadataBase: new URL('https://lingozo.vercel.app'),
  title: "Lingozo - Language Learning with AI",
  description: "Learn languages through natural AI-powered conversations. Get instant feedback, build vocabulary, and practice speaking with confidence.",
  keywords: ["language learning", "AI tutor", "conversation practice", "grammar feedback", "vocabulary builder"],
  authors: [{ name: "Lingozo" }],
  creator: "Lingozo",
  publisher: "Lingozo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lingozo",
  },
  openGraph: {
    title: "Lingozo - Language Learning with AI",
    description: "Learn languages through natural AI-powered conversations",
    url: "https://lingozo.vercel.app",
    siteName: "Lingozo",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.svg",
        width: 200,
        height: 200,
        alt: "Lingozo Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lingozo - Language Learning with AI",
    description: "Learn languages through natural AI-powered conversations",
    images: ["/logo.svg"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#7c3aed",
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
