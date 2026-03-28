"use client";

/**
 * Lightweight Analytics Wrapper
 * 
 * CORE PRINCIPLES:
 * - MINIMAL: Only tracks essential funnel events
 * - CLEAN: Simple functional API
 */

type EditorEvent = 
  | 'editor_open' 
  | 'media_added' 
  | 'voiceover_completed' 
  | 'share_intent_clicked' 
  | 'mint_success'
  | 'session_recovered';

export const trackEditorEvent = (event: EditorEvent, metadata?: Record<string, any>) => {
  // In production, this would send to DataBuddy or similar
  console.log(`📊 [Analytics] ${event}`, metadata || "");
  
  if (typeof window !== 'undefined' && (window as any).databuddy) {
    (window as any).databuddy.track(event, metadata);
  }
};
