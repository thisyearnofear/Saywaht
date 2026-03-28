"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/app/editor/mobile-editor.css";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MobileAudioPanel } from "@/components/editor/mobile-audio-panel";
import { MobileEffectsPanel } from "@/components/editor/mobile-effects-panel";
import { MobileMediaPanel } from "@/components/editor/mobile-media-panel";
import { MobilePreviewPanel } from "@/components/editor/mobile-preview-panel";
import { MobileSettingsPanel } from "@/components/editor/mobile-settings-panel";
import { MobileTextPanel } from "@/components/editor/mobile-text-panel";
import { MobileTimeline } from "@/components/editor/mobile-timeline";
import { Button } from "@/components/ui/button";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { useFarcasterShare } from "@/farcaster/hooks/use-farcaster-share";
import { useEditorHistory } from "@/hooks/use-editor-history";
import { useMobilePlaybackGate } from "@/hooks/use-mobile-playback-gate";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { useSmartNavigation } from "@/hooks/use-smart-navigation";
import {
	ChevronDown,
	ChevronUp,
	Layers,
	Loader2,
	Mic,
	Play,
	Redo2,
	Settings,
	Share2,
	Type,
	Undo2,
	Video,
	X,
	Zap,
} from "@/lib/icons";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { markTemplateEditorReady } from "@/lib/template-performance";
import { cn } from "@/lib/utils";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useProjectStore } from "@/stores/project-store";
import { useTemplateStore } from "@/stores/template-store";
import { useTextStore } from "@/stores/text-store";
import { useTimelineStore } from "@/stores/timeline-store";

import { useMissionStore } from "@/services/mission-service";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { trackEditorEvent } from "@/lib/analytics";

const QuickActions = dynamic(
	() =>
		import("@/components/editor/quick-actions").then((mod) => ({
			default: mod.QuickActions,
		})),
	{ ssr: false },
);

interface MobileEditorLayoutProps {
	children?: React.ReactNode;
	className?: string;
	hideOnboarding?: boolean;
}

type MobileTool = "record" | "media" | "text" | "effects";

const MOBILE_TOOL_CONFIG: Array<{
	id: MobileTool;
	label: string;
	icon: typeof Mic;
}> = [
	{ id: "record", label: "Record", icon: Mic },
	{ id: "media", label: "Media", icon: Video },
	{ id: "text", label: "Text", icon: Type },
	{ id: "effects", label: "Effects", icon: Layers },
];

export function MobileEditorLayout({
	children,
	className,
	hideOnboarding = false,
}: MobileEditorLayoutProps) {
	const router = useRouter();
	const { navigateToMint } = useSmartNavigation();
	const { isPlaying, isStalled, toggle, play } = usePlaybackStore();
	const { mediaItems } = useMediaStore();
	const { activeProject } = useProjectStore();
	const { tracks } = useTimelineStore();
	const { selectText, textElements } = useTextStore();
	const { isFarcasterMiniApp } = useFarcasterContext();
	const { shareToFarcaster, isSharing } = useFarcasterShare();
	const { undo, redo, canUndo, canRedo } = useEditorHistory();
	const { isApplying: isApplyingTemplate, clearSelectedTemplate } =
		useTemplateStore();
	const { gatedPlay } = useMobilePlaybackGate();
	const { level, currentXp, nextLevelXp } = useMissionStore();
	const { hasRecoverableSession, recoverSession, discardSession, isRecovering } = useSessionRecovery();

	// Check for reduced motion preference
	const prefersReducedMotion = useRef(
		typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	).current;

	const [isFinishing, setIsFinishing] = useState(false);
	const [activeTool, setActiveTool] = useState<MobileTool | null>(null);
	const [recordAutoStartNonce, setRecordAutoStartNonce] = useState(0);
	const [isRecordingInProgress, setIsRecordingInProgress] = useState(false);
	const [showCoachmark, setShowCoachmark] = useState(false);
	const [showWorkflowBar, setShowWorkflowBar] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [preferredCaptionGroupId, setPreferredCaptionGroupId] = useState<
		string | null
	>(null);
	const [isToolPanelExpanded, setIsToolPanelExpanded] = useState(false);
	const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);

	// Swipe gesture state for tool panel
	const toolPanelTouchStart = useRef<{ y: number; time: number } | null>(null);
	const hasTimelineClips = tracks.some((track) => track.clips.length > 0);
	const hasVoiceover = tracks.some(
		(t) => t.type === "audio" && t.clips.length > 0,
	);
	const hasText = textElements.length > 0;
	const isRecordingPreviewLocked =
		activeTool === "record" && isRecordingInProgress;

	// Track which workflow steps are completed
	const completedSteps = useMemo(
		() => ({
			media: hasTimelineClips,
			voice: hasVoiceover,
			text: hasText,
		}),
		[hasTimelineClips, hasVoiceover, hasText],
	);

	usePlaybackControls();

  useEffect(() => {
    trackEditorEvent("editor_open");
  }, []);

	// Auto-open media panel on first mount only when there's nothing in the timeline.
	// We intentionally omit activeTool from deps so closing the panel doesn't
	// immediately re-open it (the previous behaviour that made it impossible to dismiss).
	const hasAutoOpenedMedia = useRef(false);
	useEffect(() => {
		// Disabled auto-open for minimal experience - users explicitly tap tools
	}, []);

	useEffect(() => {
		if (hideOnboarding || typeof window === "undefined") {
			return;
		}
		const hasSeenCoachmark = window.localStorage.getItem(
			"saywaht-mobile-coachmark-v2",
		);
		if (!hasSeenCoachmark) {
			setShowCoachmark(true);
		}
	}, [hideOnboarding]);

	const dismissCoachmark = useCallback(() => {
		setShowCoachmark(false);
		if (typeof window !== "undefined") {
			window.localStorage.setItem("saywaht-mobile-coachmark-v2", "seen");
		}
	}, []);

	const openToolSheet = useCallback(
		(tool: MobileTool, options?: { autoStartRecording?: boolean }) => {
			addHapticFeedback("medium");
			setActiveTool(tool);
			if (tool === "record" && options?.autoStartRecording) {
				setRecordAutoStartNonce((prev) => prev + 1);
			}
		},
		[],
	);

	const closeToolSheet = useCallback(() => {
		addHapticFeedback("light");
		setActiveTool(null);
	}, []);

	// Tool-to-tool handoff: suggest next step when timeline gets first clip
	const prevHasClips = useRef(hasTimelineClips);
	useEffect(() => {
		if (!prevHasClips.current && hasTimelineClips && activeTool === "media") {
			toast.success("Clip added! Record a voiceover next?", {
				action: {
					label: "Record",
					onClick: () => openToolSheet("record", { autoStartRecording: true }),
				},
				duration: 4000,
			});
		}
		prevHasClips.current = hasTimelineClips;
	}, [hasTimelineClips, activeTool, openToolSheet]);

	useEffect(() => {
		if (!hasTimelineClips) return;

		markTemplateEditorReady({
			hasVoiceover,
			hasText,
			surface: isFarcasterMiniApp ? "farcaster-miniapp" : "mobile-web",
			trackCount: tracks.length,
		});
	}, [
		hasTimelineClips,
		hasText,
		hasVoiceover,
		isFarcasterMiniApp,
		tracks.length,
	]);

	const previousTimelineReadyState = useRef(hasTimelineClips);
	useEffect(() => {
		const becamePlayable =
			!previousTimelineReadyState.current && hasTimelineClips;
		previousTimelineReadyState.current = hasTimelineClips;

		// In mini-app flows we can already have a usable preview while template
		// hydration metadata is still settling. Clear stale blocking state once the
		// timeline becomes playable.
		if (isApplyingTemplate && becamePlayable) {
			clearSelectedTemplate();
			toast.dismiss();
		}
	}, [isApplyingTemplate, hasTimelineClips, clearSelectedTemplate]);

	const handleFinish = useCallback(async () => {
		addHapticFeedback("heavy");
		if (!activeProject || !hasTimelineClips) {
			toast.error("Add a clip to your timeline first", {
				action: {
					label: "Open Media",
					onClick: () => openToolSheet("media"),
				},
			});
			return;
		}

		setIsFinishing(true);
		setActiveTool(null);

		// Smooth cinematic pause before navigation
		setTimeout(async () => {
			if (isFarcasterMiniApp) {
				await shareToFarcaster();
				setIsFinishing(false);
				return;
			}

			navigateToMint(activeProject.id);
			// Don't reset isFinishing here as we are navigating away
		}, 600);
	}, [
		activeProject,
		hasTimelineClips,
		isFarcasterMiniApp,
		shareToFarcaster,
		navigateToMint,
		openToolSheet,
	]);

	return (
		<div
			className={cn(
				"relative h-full w-full overflow-hidden bg-black text-white mobile-editor",
				className,
				isRecordingPreviewLocked && "recording",
				isFarcasterMiniApp && "farcaster-miniapp",
				isFinishing && "finishing",
			)}
			style={{ opacity: 1 }} // Remove motion animation for better performance
		>
			<div className="absolute inset-0 flex flex-col">
				<div
					className={cn(
						"z-30 flex items-center justify-between border-b border-white/5 bg-black/30 px-3 pt-safe transition-all duration-500",
						isFinishing && "opacity-0 -translate-y-full",
					)}
					style={{ minHeight: "calc(2.5rem + env(safe-area-inset-top))" }}
				>
					<div className="flex items-center gap-2 py-1.5">
						<div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[8px] font-black text-white">
							W
						</div>
						<div className="flex flex-col gap-0.5 ml-1">
							<div className="flex items-center gap-1.5">
								<span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Level</span>
								<span className="text-[9px] font-black text-primary">{level}</span>
							</div>
							<div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
								<div 
									className="h-full bg-primary shadow-[0_0_5px_rgba(var(--primary),0.5)]"
									style={{ width: `${(currentXp / nextLevelXp) * 100}%` }}
								/>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-0.5 py-1.5">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 rounded-full bg-white/5"
							onClick={() => {
								addHapticFeedback("light");
								undo();
								toast("Undone", { duration: 1500 });
							}}
							disabled={!canUndo()}
							aria-label="Undo"
						>
							<Undo2 className={cn("h-3 w-3", !canUndo() && "opacity-25")} />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 rounded-full bg-white/5"
							onClick={() => {
								addHapticFeedback("light");
								redo();
								toast("Redone", { duration: 1500 });
							}}
							disabled={!canRedo()}
							aria-label="Redo"
						>
							<Redo2 className={cn("h-3 w-3", !canRedo() && "opacity-25")} />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 rounded-full bg-white/5"
							onClick={() => {
								addHapticFeedback("light");
								setShowSettings(true);
							}}
							aria-label="Settings"
						>
							<Settings className="h-3 w-3" />
						</Button>
						<Button
							variant="default"
							size="sm"
							className={cn(
								"h-7 rounded-full px-3 text-[9px] font-black uppercase tracking-wider text-white transition-all",
								hasTimelineClips
									? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.3)]"
									: "bg-muted-foreground/30",
                completedSteps.media && completedSteps.voice && !isFinishing && "animate-pulse ring-2 ring-primary/40 shadow-[0_0_15px_rgba(var(--primary),0.4)]"
							)}
							onClick={handleFinish}
							disabled={isSharing || isFinishing}
						>
							{isSharing || isFinishing ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : isFarcasterMiniApp ? (
								<>
									<Share2 className="mr-1.5 h-3.5 w-3.5" />
									Share
								</>
							) : (
								<>
									<Zap
										className={cn(
											"mr-1.5 h-3.5 w-3.5",
											hasTimelineClips && "fill-white",
										)}
									/>
									Finish
								</>
							)}
						</Button>
					</div>
				</div>

				<div
					className={cn(
						"relative flex-1 overflow-hidden transition-all duration-500",
						activeTool && "mb-[28vh]", // Reserved space to prevent timeline/nav clash, but tool floats over
					)}
				>
					          {hasTimelineClips ? (
					            <>
					              <MobilePreviewPanel
					                className={cn(
					                  "split-view-preview transition-all duration-700 ease-in-out",
					                  activeTool
					                    ? "scale-[0.82] -translate-y-6 shadow-2xl rounded-2xl"
					                    : "scale-100",
					                  isRecordingPreviewLocked && "scale-[0.75] -translate-y-12",
					                  isFinishing && "scale-[0.4] -translate-y-[20vh] opacity-0",
					                )}
					                showResolution={false}
					                showControls={false}
					                controlsVariant="overlay"
					                isFullscreen={true}
					                onTextElementTap={(textId) => {
					                  addHapticFeedback("light");
					                  selectText(textId);
					                  setActiveTool("text");
					                }}
					              />
					
					              {/* Progressive Loading Skeleton */}
					              {isApplyingTemplate && (
					                <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-md flex items-center justify-center">
					                  <div className="w-[80%] aspect-[9/16] rounded-3xl border border-white/10 bg-white/5 relative overflow-hidden">
					                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
					                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
					                      <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
					                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
					                        Analyzing Template
					                      </span>
					                    </div>
					                  </div>
					                </div>
					              )}
					
					              <button								className={cn(
									"absolute inset-0 z-10 flex items-center justify-center touch-manipulation",
									(isRecordingPreviewLocked || isFinishing) &&
										"pointer-events-none",
								)}
								onClick={() => {
									addHapticFeedback("light");
									if (activeTool) {
										closeToolSheet();
										return;
									}
									if (!isPlaying) {
										gatedPlay();
										return;
									}
									toggle();
								}}
								aria-label={
									activeTool
										? "Close panel"
										: isPlaying
											? "Pause preview"
											: "Play preview"
								}
							>
								{isRecordingPreviewLocked || isFinishing ? null : isPlaying &&
								  isStalled ? (
									<div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/35 backdrop-blur-xl">
										<Loader2 className="h-7 w-7 animate-spin text-white" />
									</div>
								) : !isPlaying ? (
									<div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/35 backdrop-blur-xl">
										<Play className="ml-0.5 h-8 w-8 fill-white text-white" />
									</div>
								) : null}
							</button>
						</>
					) : (
						<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-neutral-950 via-black to-neutral-950">
							<div className="mx-5 rounded-2xl border border-white/15 bg-black/55 p-5 text-center backdrop-blur">
								<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
									<Video className="h-6 w-6 text-primary" />
								</div>
								<p className="text-sm font-black uppercase tracking-tight text-white">
									Add your first clip
								</p>
								<p className="mt-1.5 text-[11px] leading-relaxed text-white/60">
									Pick a clip from Media, then tap{" "}
									<span className="font-bold text-white/80">Add</span> to place
									it on the timeline.
								</p>
								<Button
									size="sm"
									className="mt-4 h-10 w-full rounded-full text-[10px] font-black uppercase tracking-widest"
									onClick={() => openToolSheet("media")}
								>
									<Video className="mr-1.5 h-3.5 w-3.5" />
									Open Media
								</Button>
							</div>
						</div>
					)}
				</div>

				{/* Persistent Pro Timeline - Always visible for scrubbing unless in extreme recording mode */}
				{!isRecordingPreviewLocked && hasTimelineClips && (
					<div
						className={cn(
							"z-20 border-t border-white/5 bg-black/10 backdrop-blur-sm transition-all duration-500 flex flex-col",
							isTimelineCollapsed ? "h-[4vh]" : "h-[10vh]",
							(activeTool || isFinishing) &&
								"opacity-0 pointer-events-none translate-y-4", // Hide timeline when tool is active for better focus
						)}
					>
						<button
							className="flex items-center justify-center py-0.5 hover:bg-white/5 transition-colors"
							onClick={() => {
								addHapticFeedback("light");
								setIsTimelineCollapsed(!isTimelineCollapsed);
							}}
							aria-label={
								isTimelineCollapsed ? "Expand timeline" : "Collapse timeline"
							}
						>
							{isTimelineCollapsed ? (
								<span className="text-[8px] font-medium text-white/40 uppercase tracking-wider">
									Swipe up for timeline
								</span>
							) : (
								<ChevronDown className="h-3 w-3 text-white/30" />
							)}
						</button>
						{!isTimelineCollapsed && <MobileTimeline compact={true} />}
					</div>
				)}

				{/* Active Tool Panel (Floating Glass Dock) */}
				{activeTool && (
					<div
						className={cn(
							"absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 mx-3 mb-2 flex flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300",
							activeTool === "record"
								? isRecordingPreviewLocked
									? "h-[22vh]"
									: "h-[30vh]"
								: "h-[35vh]",
							"max-h-[40vh]",
						)}
						onTouchStart={(e) => {
							toolPanelTouchStart.current = {
								y: e.touches[0].clientY,
								time: Date.now(),
							};
						}}
						onTouchEnd={(e) => {
							if (!toolPanelTouchStart.current) return;
							const deltaY =
								e.changedTouches[0].clientY - toolPanelTouchStart.current.y;
							const deltaTime = Date.now() - toolPanelTouchStart.current.time;

							// Swipe down: deltaY > 50px within 500ms -> close panel
							if (deltaY > 50 && deltaTime < 500) {
								addHapticFeedback("light");
								closeToolSheet();
							}
							toolPanelTouchStart.current = null;
						}}
					>
						<div className="flex-1 flex flex-col min-h-0">
							{!isRecordingPreviewLocked && (
								<div className="flex items-center justify-end gap-2 px-5 pt-3 pb-1 shrink-0 bg-transparent">
									<span className="mr-auto text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
										{activeTool}
									</span>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 rounded-full bg-white/5 text-white/30"
										onClick={() => closeToolSheet()}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							)}

							<div className="flex-1 min-h-0 overflow-hidden px-2 pb-2">
								{activeTool === "record" && (
									<MobileAudioPanel
										autoStartRecordingNonce={recordAutoStartNonce}
										onRecordingStateChange={(state) => {
											setIsRecordingInProgress(state === "recording");
										}}
										onCaptionsGenerated={({ groupId, count }) => {
											setPreferredCaptionGroupId(groupId);
											setActiveTool("text");
											toast.success(
												`Generated ${count} captions. Edit them in Text.`,
											);
										}}
									/>
								)}
								{activeTool === "media" && (
									<MobileMediaPanel
										onMediaAdded={() => {
											// Optionally close tool sheet after adding media
										}}
									/>
								)}
								{activeTool === "text" && (
									<MobileTextPanel
										preferredCaptionGroupId={preferredCaptionGroupId}
									/>
								)}
								{activeTool === "effects" && (
									<MobileEffectsPanel
										onRequestMedia={() => openToolSheet("media")}
									/>
								)}
							</div>
						</div>
					</div>
				)}
										className="h-6 w-6 rounded-full bg-white/5"
										onClick={closeToolSheet}
									>
										<X className="h-3 w-3" />
									</Button>
								</div>
							)}

							<div className="flex-1 min-h-0 overflow-hidden bg-black/30">
								{activeTool === "record" && (
									<MobileAudioPanel
										autoStartRecordingNonce={recordAutoStartNonce}
										onRecordingStateChange={(state) => {
											setIsRecordingInProgress(state === "recording");
										}}
										onCaptionsGenerated={({ groupId, count }) => {
											setPreferredCaptionGroupId(groupId);
											setActiveTool("text");
											toast.success(
												`Generated ${count} captions. Edit them in Text.`,
											);
										}}
									/>
								)}
								{activeTool === "media" && (
									<MobileMediaPanel
										onMediaAdded={() => {
											// Optionally close tool sheet after adding media
										}}
									/>
								)}
								{activeTool === "text" && (
									<MobileTextPanel
										preferredCaptionGroupId={preferredCaptionGroupId}
									/>
								)}
								{activeTool === "effects" && (
									<MobileEffectsPanel
										onRequestMedia={() => openToolSheet("media")}
									/>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Bottom Navigation */}
				{!isRecordingPreviewLocked && (
					<div
						className={cn(
							"z-30 border-t border-white/5 bg-black/30 backdrop-blur-sm px-3 pb-safe shrink-0 transition-all duration-500",
							isFinishing && "translate-y-full opacity-0",
						)}
						style={{
							paddingBottom:
								"max(0.75rem, calc(env(safe-area-inset-bottom) + 0.35rem))",
						}}
					>
						<div className="grid grid-cols-4 gap-1 py-1">
							{MOBILE_TOOL_CONFIG.map((tool) => {
								const Icon = tool.icon;
								const isActive = activeTool === tool.id;
                
                // GUIDED WORKFLOW: Pulse the next recommended action
                const shouldPulse = 
                  (tool.id === "media" && !completedSteps.media) ||
                  (tool.id === "record" && completedSteps.media && !completedSteps.voice);

								return (
									<button
										key={tool.id}
										className={cn(
											"flex h-12 flex-col items-center justify-center rounded-xl border text-white transition-all active:scale-95 relative",
											isActive
												? "border-primary/20 bg-primary/20 tool-active-glow z-10"
												: "border-white/5 bg-white/[0.04]",
                      shouldPulse && !isActive && "ring-2 ring-primary/40 animate-pulse border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
										)}
										onClick={() => {
											addHapticFeedback("light");
											if (tool.id === "record") {
												openToolSheet("record", { autoStartRecording: true });
											} else {
												openToolSheet(tool.id);
											}
										}}
										aria-label={tool.label}
									>
										<div
											className={cn(
												"flex h-7 w-7 items-center justify-center rounded-full mb-0.5",
												isActive ? "bg-primary text-white" : "text-white/40",
											)}
										>
											<Icon
												className={cn(
													"h-4 w-4",
													tool.id === "record" &&
														!isActive &&
														"text-red-500/80",
												)}
											/>
										</div>
										<span
											className={cn(
												"text-[8px] font-black uppercase tracking-[0.12em]",
												isActive ? "text-white" : "text-white/25",
											)}
										>
											{tool.label}
										</span>
										{(tool.id === "media"
											? completedSteps.media
											: tool.id === "record"
												? completedSteps.voice
												: completedSteps.text) && (
											<div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
										)}
									</button>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{showCoachmark && (
				<div className="absolute bottom-24 left-3 right-3 z-40 rounded-2xl border border-primary/20 bg-background/95 p-3 shadow-2xl">
					<div className="flex items-start gap-3">
						<div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
						<div className="flex-1">
							<p className="text-xs font-semibold text-foreground">
								{!hasTimelineClips
									? "Start by adding media to your timeline."
									: !hasVoiceover
										? "Nice! Now tap Record to add your voiceover."
										: "Looking good! Add text or tap Finish when ready."}
							</p>
							<p className="mt-1 text-[11px] text-muted-foreground">
								{!hasTimelineClips
									? "Open Media → choose a clip → tap Add."
									: !hasVoiceover
										? "Your voice is recorded over the video preview."
										: "Captions were auto-generated from your recording."}
							</p>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 rounded-full"
							onClick={dismissCoachmark}
							aria-label="Dismiss tip"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}

			<div className="hidden md:block">
				<QuickActions />
			</div>
			{children}

			{/* Template Loading Overlay */}
			{isApplyingTemplate && !hasTimelineClips && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
					<div className="flex flex-col items-center gap-4">
						<Loader2 className="h-12 w-12 animate-spin text-primary" />
						<div className="text-center">
							<p className="text-sm font-black uppercase tracking-widest text-white">
								Loading Template
							</p>
							<p className="mt-1 text-xs text-white/60">
								Loading template assets...
							</p>
						</div>
					</div>
				</div>
			)}

			      <MobileSettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
			
			      {/* Session Recovery Prompt */}
			      <AnimatePresence>
			        {hasRecoverableSession && (
			          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
			            <motion.div
			              initial={{ opacity: 0, scale: 0.9, y: 20 }}
			              animate={{ opacity: 1, scale: 1, y: 0 }}
			              exit={{ opacity: 0, scale: 0.9, y: 20 }}
			              className="bg-black/60 border border-white/10 rounded-[2.5rem] max-w-sm w-full p-8 text-center shadow-[0_30px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
			            >
			              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 mx-auto border border-primary/20">
			                <Undo2 className="h-8 w-8 text-primary" />
			              </div>
			              
			              <h2 className="text-xl font-black uppercase tracking-tight text-white mb-2">
			                Unfinished Work?
			              </h2>
			              <p className="text-white/40 text-[13px] font-bold uppercase tracking-widest leading-relaxed mb-8">
			                We found a previous session that wasn't finished. Would you like to restore it?
			              </p>
			
			              <div className="space-y-3">
			                <Button
			                  className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-primary text-white shadow-xl shadow-primary/20 transition-all active:scale-95"
			                  onClick={recoverSession}
			                  disabled={isRecovering}
			                >
			                  {isRecovering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
			                  Restore Session
			                </Button>
			                <Button
			                  variant="ghost"
			                  className="w-full h-12 text-white/20 font-black uppercase tracking-widest text-[9px] hover:text-white/40"
			                  onClick={discardSession}
			                  disabled={isRecovering}
			                >
			                  Discard & Start New
			                </Button>
			              </div>
			            </motion.div>
			          </div>
			        )}
			      </AnimatePresence>
			    </div>
			  );
			}
