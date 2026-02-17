"use client";

import nextDynamic from "next/dynamic";
import { Loader2 } from "@/lib/icons";

const EditorClient = nextDynamic(() => import("./editor-client"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background animate-in fade-in duration-700">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
        <Loader2 className="h-12 w-12 text-primary animate-spin relative z-10" />
      </div>
      <p className="mt-6 text-sm font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
        Initializing Engine
      </p>
    </div>
  ),
});

export default function EditorPage() {
  return <EditorClient />;
}
