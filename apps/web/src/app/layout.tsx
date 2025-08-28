import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { Web3Provider } from "@/components/wagmi-provider";
import { MobileProvider } from "@/contexts/mobile-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://saywhat.vercel.app"
  ),
  title: "SayWhat",
  description:
    "A simple but powerful video editor that gets the job done. In your browser.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SayWhat",
  },
  openGraph: {
    title: "SayWhat",
    description:
      "A simple but powerful video editor that gets the job done. In your browser.",
    url: "/",
    siteName: "SayWhat",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 630,
        alt: "SayWhat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SayWhat",
    description:
      "A simple but powerful video editor that gets the job done. In your browser.",
    creator: "@saywhatapp",
    images: ["/opengraph-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Web3Provider>
          <ThemeProvider attribute="class" forcedTheme="dark" enableSystem>
            <MobileProvider>
              <TooltipProvider>
                {children}
                <Analytics />
                <Toaster />
              </TooltipProvider>
            </MobileProvider>
          </ThemeProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
