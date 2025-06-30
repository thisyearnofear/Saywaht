"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import {
  ArrowLeft,
  Download,
  Share2,
  Settings,
  Play,
  Pause,
  MoreHorizontal,
  Coins,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { usePlaybackStore } from "@/stores/playback-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { useAccount } from "wagmi";
import { toast } from "sonner";

export function EditorHeader() {
  const { activeProject } = useProjectStore();
  const { isPlaying, toggle } = usePlaybackStore();
  const { address } = useAccount();

  // Save functionality temporarily removed - will implement decentralized storage later

  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  const handleMint = () => {
    if (!activeProject) return;
    window.open(`/mint/${activeProject.id}`, "_blank");
  };

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          <Image
            src="/logo.png"
            alt="SayWhat"
            width={24}
            height={24}
            className="rounded-sm"
          />
          <span className="font-semibold text-sm">SayWhat</span>
        </Link>

        <div className="w-px h-6 bg-border" />

        <div className="flex items-center gap-2">
          <h1 className="font-medium text-sm truncate max-w-[200px]">
            {activeProject?.name || "Untitled Project"}
          </h1>
          <Badge variant="secondary" className="text-xs">
            Draft
          </Badge>
        </div>
      </div>

      {/* Center Section - Playback Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="text"
          size="sm"
          onClick={toggle}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button
          variant="text"
          size="sm"
          onClick={handleExport}
          className="text-xs font-medium"
        >
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>

        {address && (
          <Button
            variant="default"
            size="sm"
            onClick={handleMint}
            className="text-xs font-medium bg-primary hover:bg-primary/90"
          >
            <Coins className="h-4 w-4 mr-1" />
            Mint
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="text" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Share2 className="h-4 w-4 mr-2" />
              Share Project
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Project Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
