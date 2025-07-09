"use client";

import { motion } from "motion/react";
import { Button } from "../ui/button";
import { ArrowRight, Sparkles, Video, Coins, Zap } from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Hero() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between items-center text-center px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-2 h-2 bg-primary/20 rounded-full"
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-40 right-20 w-1 h-1 bg-primary/30 rounded-full"
          animate={{
            y: [0, -15, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <motion.div
          className="absolute bottom-40 left-20 w-3 h-3 bg-primary/15 rounded-full"
          animate={{
            y: [0, -25, 0],
            opacity: [0.2, 0.7, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center relative z-10"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="inline-flex items-center gap-2 mx-auto mb-8 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          Create • Edit • Deploy • Trade
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="inline-block"
        >
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
            SayWhat
          </h1>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter mt-2 bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
            Coin Your Commentary
          </h1>
        </motion.div>

        <motion.p
          className="mt-8 text-lg sm:text-xl text-muted-foreground font-light tracking-wide max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Transform your thoughts into viral content. Create compelling videos,
          add your unique voice, and deploy them as tradeable Zora Coins. Where
          creativity meets crypto.
        </motion.p>

        {/* Feature highlights */}
        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            <span>Timeline Editor</span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            <span>Deploy as Coin</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span>No Watermarks</span>
          </div>
        </motion.div>

        <motion.div
          className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {isConnected ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/editor">
                <Button
                  size="lg"
                  className="px-8 h-12 text-base font-medium bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Video className="mr-2 h-4 w-4" />
                  Create Video
                </Button>
              </Link>
              <Link href="/trade">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 h-12 text-base font-medium border-2 hover:bg-accent/50 transition-all duration-200"
                >
                  <Coins className="mr-2 h-4 w-4" />
                  Trade Coins
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <ConnectButton />
              <p className="text-xs text-muted-foreground">
                Connect wallet to get started
              </p>
            </div>
          )}

          <Link href="#features">
            <Button
              variant="outline"
              size="lg"
              className="px-8 h-12 text-base font-medium border-2 hover:bg-accent/50 transition-all duration-200"
            >
              Learn More
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        className="mb-8 text-center text-sm text-muted-foreground/60 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span>Currently in beta</span>
          <span className="hidden sm:inline">•</span>
          <Link
            href="https://github.com/OpenCut-app/OpenCut"
            className="text-foreground underline hover:text-primary transition-colors"
          >
            Open source on GitHub
          </Link>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            All systems operational
          </span>
        </div>
      </motion.div>
    </div>
  );
}
