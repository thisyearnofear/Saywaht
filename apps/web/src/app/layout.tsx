import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { Web3Provider } from "@/components/wagmi-provider";
import { MobileProvider } from "@/contexts/mobile-context";
import { FarcasterProvider } from "@/farcaster/components/farcaster-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!baseUrl) {
  throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
}

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Saywaht - Create Video Commentary Coins",
  description:
    "AI-powered video creation platform for creating and trading commentary coins. Turn your video reactions into tradable cryptocurrency tokens.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Saywaht",
  },
  openGraph: {
    title: "Saywaht - Create Video Commentary Coins",
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
    title: "Saywaht - Create Video Commentary Coins",
    description:
      "AI-powered video creation platform for creating and trading commentary coins. Turn your video reactions into tradable cryptocurrency tokens.",
    creator: "@saywahtapp",
    images: ["/opengraph-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  // Farcaster Frame Metadata
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": `${baseUrl}/api/farcaster/image`,
    "fc:frame:post_url": `${baseUrl}/api/farcaster/action`,
    "fc:frame:button:1": "Create Commentary",
    "fc:frame:button:2": "Browse Coins",
    // Mini app metadata - 2025 format with stringified JSON
    "fc:miniapp": JSON.stringify({
      "version": "1",
      "imageUrl": `${baseUrl}/opengraph-image.jpg`,
      "button": {
        "title": "🎬 Open Saywaht",
        "action": {
          "type": "launch_frame",
          "name": "Saywaht",
          "url": baseUrl,
          "splashImageUrl": `${baseUrl}/images/android-chrome-512x512.png`,
          "splashBackgroundColor": "#000000"
        }
      }
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Web3Provider>
          <ThemeProvider attribute="class" forcedTheme="dark" enableSystem>
            <MobileProvider>
              <FarcasterProvider>
                <TooltipProvider>
                  {children}
                  <Toaster />
                </TooltipProvider>
              </FarcasterProvider>
            </MobileProvider>
          </ThemeProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
