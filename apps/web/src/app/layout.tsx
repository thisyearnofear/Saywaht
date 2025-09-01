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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.netlify.app"
  ),
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
    "fc:frame:image": `${
      process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.netlify.app"
    }/api/farcaster/image`,
    "fc:frame:post_url": `${
      process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.netlify.app"
    }/api/farcaster/action`,
    "fc:frame:button:1": "Create Commentary",
    "fc:frame:button:2": "Browse Coins",
    // Farcaster Mini App Embed Metadata
    "fc:miniapp": "Saywaht",
    "fc:miniapp:url": process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.netlify.app",
    "fc:miniapp:version": "1",
    "fc:miniapp:image": `${process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.netlify.app"}/opengraph-image.jpg`,
    "fc:miniapp:button": "Open Saywaht",
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
