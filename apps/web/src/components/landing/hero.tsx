"use client";

import { motion } from "motion/react";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Hero() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between items-center text-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="inline-block"
        >
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter">
            SayWhat
          </h1>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter mt-2">
            Coin Your Commentary
          </h1>
        </motion.div>

        <motion.p
          className="mt-10 text-lg sm:text-xl text-muted-foreground font-light tracking-wide max-w-xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Create a video, add your voice, and mint it as a Zora Coin. The best
          matchups get coined.
        </motion.p>

        <motion.div
          className="mt-12 flex gap-4 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {isConnected ? (
            <Link href="/editor">
              <Button size="lg" className="px-6 h-11 text-base">
                Launch App
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <ConnectButton />
          )}
        </motion.div>
      </motion.div>

      <motion.div
        className="mb-8 text-center text-sm text-muted-foreground/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        Currently in beta • Open source on{" "}
        <Link
          href="https://github.com/OpenCut-app/OpenCut"
          className="text-foreground underline"
        >
          GitHub
        </Link>
      </motion.div>
    </div>
  );
}
