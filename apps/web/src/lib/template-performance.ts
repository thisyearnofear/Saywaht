"use client";

import { recordCustomMetric } from "@/lib/performance-monitor";

type TemplateFlowSource = "template-pack" | "stock-video";
type TemplateFlowSurface = "farcaster-miniapp" | "mobile-web" | "desktop-web";

interface PendingTemplateFlow {
  startedAt: number;
  templateId: string;
  source: TemplateFlowSource;
  surface: TemplateFlowSurface;
  editorReadyAt?: number;
  firstFrameAt?: number;
}

let pendingFlow: PendingTemplateFlow | null = null;

export function startTemplateFlowMeasurement(flow: {
  templateId: string;
  source: TemplateFlowSource;
  surface: TemplateFlowSurface;
}) {
  pendingFlow = {
    ...flow,
    startedAt: performance.now(),
  };
}

export function markTemplateEditorReady(context?: Record<string, unknown>) {
  if (!pendingFlow || pendingFlow.editorReadyAt) return;

  pendingFlow.editorReadyAt = performance.now();
  const duration = pendingFlow.editorReadyAt - pendingFlow.startedAt;

  recordCustomMetric("template-editor-ready", duration, "ms", {
    templateId: pendingFlow.templateId,
    source: pendingFlow.source,
    surface: pendingFlow.surface,
    ...context,
  });
}

export function markTemplateFirstFrameReady(context?: Record<string, unknown>) {
  if (!pendingFlow || pendingFlow.firstFrameAt) return;

  pendingFlow.firstFrameAt = performance.now();
  const firstFrameDuration = pendingFlow.firstFrameAt - pendingFlow.startedAt;

  recordCustomMetric("template-first-frame", firstFrameDuration, "ms", {
    templateId: pendingFlow.templateId,
    source: pendingFlow.source,
    surface: pendingFlow.surface,
    editorReadyMs: pendingFlow.editorReadyAt
      ? pendingFlow.editorReadyAt - pendingFlow.startedAt
      : undefined,
    ...context,
  });

  pendingFlow = null;
}

