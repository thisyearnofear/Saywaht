import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/react";
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
    process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.vercel.app"
  ),
  title: "saywaht",
  description:
    "A simple but powerful video editor that gets the job done. In your browser.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "saywaht",
  },
  openGraph: {
    title: "saywaht",
    description:
      "A simple but powerful video editor that gets the job done. In your browser.",
    url: "/",
    siteName: "saywaht",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 630,
        alt: "saywaht",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "saywaht",
    description:
      "A simple but powerful video editor that gets the job done. In your browser.",
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
    "fc:frame:image": `${process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.vercel.app"}/api/farcaster/image`,
    "fc:frame:post_url": `${process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.vercel.app"}/api/farcaster/action`,
    "fc:frame:button:1": "Create Reaction",
    "fc:frame:button:2": "View Templates",
  }
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
                  <Analytics />
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
