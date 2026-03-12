import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { Web3ProviderLazy } from "@/components/web3-provider-lazy";
import { MobileProvider } from "@/contexts/mobile-context";
import { FarcasterProvider } from "@/farcaster/components/farcaster-provider";
import { PerformanceTracker } from "@/components/performance-tracker";
import { generateMiniAppEmbed } from "@/farcaster/utils/frame-utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// ENHANCEMENT: Graceful fallback for missing environment variable
const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.netlify.app";
if (!process.env.NEXT_PUBLIC_APP_URL) {
  console.warn("NEXT_PUBLIC_APP_URL not set, using fallback:", baseUrl);
}

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Saywaht - Coin Your Commentary",
  description:
    "AI-powered video creation platform for creating and trading commentary coins. Turn your video reactions into tradable cryptocurrency tokens.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Saywaht",
  },
  openGraph: {
    title: "Saywaht - Coin Your Commentary",
    description:
      "AI-powered video creation platform for creating and trading commentary coins. Turn your video reactions into tradable cryptocurrency tokens.",
    url: "/",
    siteName: "Saywaht",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 630,
        alt: "Saywaht - Video Commentary Coin Creation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Saywaht - Coin Your Commentary",
    description:
      "AI-powered video creation platform for creating and trading commentary coins. Turn your video reactions into tradable cryptocurrency tokens.",
    creator: "@saywahtapp",
    images: ["/opengraph-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  // Farcaster Mini App v2 Metadata - Single source of truth
  other: {
    "fc:miniapp": JSON.stringify(
      generateMiniAppEmbed({
        button: {
          title: "🎬 Open Saywaht",
          action: {
            type: "launch_frame",
            name: "Saywaht",
            url: `${baseUrl}/farcaster`,
            splashImageUrl: `${baseUrl}/images/android-chrome-512x512.png`,
            splashBackgroundColor: "#000000",
          },
        },
      })
    ),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* ENHANCEMENT: Force branded first paint before CSS/JS hydration */}
        <meta name="theme-color" content="#000000" />
        <style>{`html, body { background: #000000 !important; }`}</style>
        {/* ENHANCEMENT: Improved viewport for mobile wallet compatibility */}
        {/* Removed user-scalable=no to prevent issues with wallet browsers */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover"
        />
        {/* ENHANCEMENT: Mobile wallet specific meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* ENHANCEMENT: Prevent text size adjustment on orientation change */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} style={{ backgroundColor: "#09090b" }}>
        <Web3ProviderLazy>
          <ThemeProvider attribute="class" forcedTheme="dark" enableSystem>
            <MobileProvider>
              <FarcasterProvider>
                <TooltipProvider>
                  {children}
                  <Toaster />
                  {/* PERFORMANT: Track app performance metrics */}
                  <PerformanceTracker />
                </TooltipProvider>
              </FarcasterProvider>
            </MobileProvider>
          </ThemeProvider>
        </Web3ProviderLazy>
      </body>
    </html>
  );
}
