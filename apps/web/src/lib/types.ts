// Single source of truth for shared type definitions
// Enhanced type system with better organization and comprehensive coverage

import type { ComponentProps, ReactNode, CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// REACT TYPES - Re-exports for convenience
// ============================================================================
export type { ReactNode, ComponentProps, CSSProperties } from "react";

// ============================================================================
// CORE APPLICATION TYPES
// ============================================================================

// Blockchain types
export type Address = `0x${string}`;
export type ChainId = number;
export type TokenAmount = string;

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

// Icon system types
export interface IconProps {
  size?: number | string;
  className?: string;
  color?: string;
  strokeWidth?: number | string;
}

// Button component types (matching actual implementation)
export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "text"
  | "link";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

// ============================================================================
// EDITOR & MEDIA TYPES
// ============================================================================

// Export progress types
export type ExportPhase =
  | 'initializing'
  | 'preloading'
  | 'extracting'
  | 'audio'
  | 'frames'
  | 'encoding'
  | 'finalizing';

export interface ExportProgress {
  phase: ExportPhase;
  percentage: number;
  message: string;
}

// Media types
export interface MediaFile {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  url: string;
  duration?: number;
  size: number;
}

// Timeline types
export interface TimelineClip {
  id: string;
  mediaId: string;
  startTime: number;
  endTime: number;
  track: number;
}

// ============================================================================
// TOUCH & GESTURE TYPES
// ============================================================================

export interface TouchGestureOptions {
  threshold?: number;
  velocityThreshold?: number;
  longPressDelay?: number;
  preventDefault?: boolean;
  enablePinch?: boolean;
  enableSwipe?: boolean;
  enablePan?: boolean;
  enableLongPress?: boolean;
}

export interface GestureState {
  isActive: boolean;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  velocity: { x: number; y: number };
}

// ============================================================================
// PROJECT & TEMPLATE TYPES (Consolidated from separate files)
// ============================================================================

// Basic project type
export interface TProject {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced project type
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  isPublic: boolean;
}

// Template system types
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  thumbnailUrl: string;
  videoUrl?: string;
  duration?: number;
  tags: string[];
  hasAudio: boolean;
  source?: {
    name: string;
    url?: string;
    author?: string;
  };
  aspectRatio: "landscape" | "portrait" | "square";
  recommendedFormat?: "landscape" | "portrait" | "square";
  mediaItems: TemplateMediaItem[];
  timelineTracks?: TemplateTimelineTrack[];
  instructions?: {
    title: string;
    steps: string[];
  };
}

export interface TemplateMediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  aspectRatio: number;
}

export interface TemplateTimelineTrack {
  id: string;
  name: string;
  type: "video" | "audio" | "effects";
  clips: TemplateTimelineClip[];
  muted?: boolean;
}

export interface TemplateTimelineClip {
  id: string;
  mediaId: string;
  name: string;
  duration: number;
  startTime: number;
  trimStart: number;
  trimEnd: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  templates: Template[];
  inspiration?: {
    title?: string;
    description?: string;
    examples: InspirationExample[];
  };
}

export interface InspirationExample {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  url: string;
  source: string;
  embedType?: string;
}

// ============================================================================
// PLAYBACK TYPES (Consolidated from separate files)
// ============================================================================

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  speed: number;
  muted: boolean;
  previousVolume?: number;
}

export interface PlaybackControls {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setSpeed: (speed: number) => void;
  toggle: () => void;
  mute: () => void;
  unmute: () => void;
  toggleMute: () => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
