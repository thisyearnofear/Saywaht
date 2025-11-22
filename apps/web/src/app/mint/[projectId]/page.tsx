"use client";

import { Header } from "@/components/header";
import { motion } from "motion/react";
import { MintWizard } from "@/components/mint/mint-wizard";
import { useParams, useSearchParams } from "next/navigation";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { Badge } from "@/components/ui/badge";

export default function DeployPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const dataUrl = searchParams.get('dataUrl');
  const { preferences } = useUserPreferencesStore();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground mb-4">
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Deploy as Coin</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Create Your Video Coin
            </h1>
            <p className="text-muted-foreground">
              Transform your video into a tradeable Zora Coin with our
              step-by-step wizard
            </p>
            {preferences.hasCreatorCoin && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <Badge variant="default" className="text-xs">Creator Coin detected</Badge>
                <span className="text-xs text-muted-foreground">
                  This mint will prefer creator-backed markets.
                </span>
                <a
                  href="https://docs.zora.co/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Learn more
                </a>
              </div>
            )}
          </div>

          {/* Wizard */}
          <MintWizard projectId={projectId} dataUrl={dataUrl} />
        </motion.div>
      </div>
    </div>
  );
}
