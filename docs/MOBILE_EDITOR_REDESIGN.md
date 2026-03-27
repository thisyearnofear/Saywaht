# Mobile Editor Redesign - Drawer to Minimal Overlay

## Problem Statement

Users are reporting poor experience with the editor mode on small screens (mobile, FarCaster mini apps):
- **Drawer blocks the video** - gets in the way while trying to edit
- **Too much vertical space consumed** - 30-35% of screen taken by tool panels
- **Users want minimal UI** - icons + translucent overlay that doesn't block the preview

## Current Architecture

```
┌─────────────────────────────┐
│ Header (48px) - logo, settings, undo/redo, finish │
├─────────────────────────────┤
│ Workflow Bar (32px) - Media → Voice → Text        │
├─────────────────────────────────────────────────────┤
│                                                     │
│              Preview Area                          │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Timeline (10-18vh) - always visible               │
├─────────────────────────────────────────────────────┤
│ Tool Panel (30-35vh) - slides up on tap            │ ← PROBLEM
├─────────────────────────────────────────────────────┤
│ Bottom Nav (56px) - Record/Media/Text/Effects     │
└─────────────────────────────┘
```

---

## Workstream 1: User (Frontend Changes)

**Owner**: You (the user)  
**Scope**: Direct UI/UX changes to the mobile editor layout

### Tasks

1.1 **Simplify Header**
- Remove workflow bar (or make it tooltip-based)
- Keep only essential actions: logo, settings, finish
- Consider moving undo/redo to a "more" menu

1.2 **Reduce Timeline Height**
- Make timeline collapsible (swipe down to hide)
- Default to thinner state (8vh max) when tools are open
- Only expand on scrub interaction

1.3 **Reduce Tool Panel Height**
- Change from 30-35vh → 15-20vh max
- Use scrollable content inside instead of full-height panel
- Add "expand" button if more space needed

1.4 **Add Glassmorphism**
- Use `backdrop-blur-xl` and `bg-black/60` for panels
- Make tool panels translucent so video shows through
- Add subtle borders: `border-white/10`

### Files to Modify
- `apps/web/src/components/editor/mobile-editor-layout.tsx`
- `apps/web/src/app/editor/mobile-editor.css`

---

## Workstream 2: AI (Architecture & New Components)

**Owner**: AI (this session)  
**Scope**: Create new overlay system and refactor tool panels

### Tasks

2.1 **Create Floating Icon Toolbar Component**
- New component: `floating-toolbar.tsx`
- Position: corners of preview area (not blocking center)
- Icons: Record, Media, Text, Effects
- Tap → expands to small floating panel (not full screen)
- Tap outside → dismisses

2.2 **Create Translucent Overlay Panel**
- New component: `overlay-panel.tsx`
- Max height: 20vh
- Glassmorphism styling
- Animated entry/exit (fade + scale)

2.3 **Refactor Tool Panels to Overlay Style**
- `mobile-media-panel.tsx` → adapt to overlay
- `mobile-text-panel.tsx` → adapt to overlay
- `mobile-audio-panel.tsx` → adapt to overlay
- `mobile-effects-panel.tsx` → adapt to overlay

2.4 **Add Gesture Support**
- Swipe left/right on preview to switch tools
- Swipe down to dismiss panel
- Pinch to zoom preview while editing

2.5 **Update MobileEditorLayout**
- Remove full-height tool panel logic
- Integrate floating toolbar
- Add overlay panel system

### New Files to Create
- `apps/web/src/components/editor/floating-toolbar.tsx`
- `apps/web/src/components/editor/overlay-panel.tsx`

### Files to Modify
- `apps/web/src/components/editor/mobile-editor-layout.tsx`
- `apps/web/src/components/editor/mobile-media-panel.tsx`
- `apps/web/src/components/editor/mobile-text-panel.tsx`
- `apps/web/src/components/editor/mobile-audio-panel.tsx`
- `apps/web/src/components/editor/mobile-effects-panel.tsx`

---

## Target Design

```
┌─────────────────────────────────────┐
│ W        [settings] [finish]        │ ← Minimal header
├─────────────────────────────────────┤
│                                     │
│    ┌─────┐                   ┌────┐ │
│    │ 📹  │                   │ 📝 │ │ ← Floating icons (edges)
│    └─────┘                   └────┘ │
│                                     │
│         ┌───────────────┐          │
│         │ Overlay Panel │          │ ← Translucent, 15-20vh
│         │ (scrollable)  │          │
│         └───────────────┘          │
│                                     │
│         [ Video Preview ]          │
│                                     │
├─────────────────────────────────────┤
│ [Timeline - collapsible, 8vh]     │
├─────────────────────────────────────┤
│ [●] [📹] [📝] [✨]                 │ ← Bottom nav (smaller)
└─────────────────────────────────────┘
```

## Success Criteria

- [ ] Tool panels take max 20vh (not 35vh)
- [ ] Video preview remains visible while editing
- [ ] Translucent overlays with blur effect
- [ ] Tap outside dismisses panel
- [ ] Works on FarCaster mini app
- [ ] Works on mobile web

---

## Parallel Execution

**Start both workstreams simultaneously:**

1. **You (Workstream 1)**: Make quick UI tweaks - reduce heights, add glassmorphism
2. **Me (Workstream 2)**: Build the new overlay system

We'll review together when both are complete.