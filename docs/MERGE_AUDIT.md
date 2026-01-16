# Pre-Merge Audit: Scene System + Text Elements

**Date:** January 16, 2026  
**Branch:** `feature/upstream-merge-phase1`

## 🎯 Audit Overview

Following Core Principles:
- **ENHANCEMENT FIRST**: Extend existing stores where possible
- **AGGRESSIVE CONSOLIDATION**: Identify and remove duplication
- **PREVENT BLOAT**: Only merge essential code
- **DRY**: Single source of truth
- **CLEAN**: Maintain separation of concerns

---

## 📊 Current State Analysis

### Our Stores
```
/stores/
├── canvas-store.ts          ✅ Canvas/preview settings
├── editor-store.ts          ✅ Editor UI state
├── media-store.ts           ✅ Media items management
├── panel-store.ts           ✅ Panel sizes/state
├── playback-store.ts        ✅ Playback controls
├── project-store.ts         ✅ Project management
├── template-store.ts        ✅ Template system (our unique feature)
└── timeline-store.ts        ✅ Timeline tracks/clips
```

**What's missing:**
- Scene management (no multi-scene support)
- Text element support (no text layers)
- Text properties management

### Our Components Structure
```
/components/editor/
├── media-panel.tsx          ⚠️  Single view, no tabs
├── preview-panel.tsx        ✅ Video preview
├── timeline.tsx             ⚠️  No text element support
├── welcome-screen.tsx       ✅ Template selection
└── ...
```

---

## 🔍 Upstream Analysis

### Upstream Stores
```
scene-store.ts               📦 NEW - Scene management (318 lines)
text-properties-store.ts     📦 NEW - Text editing state
stickers-store.ts            📦 NEW - Stickers (skip for now)
sounds-store.ts              📦 NEW - Sound effects (skip for now)
keybindings-store.ts         📦 NEW - Keyboard shortcuts (Phase 2)
```

### Upstream Components
```
scenes-view.tsx              📦 NEW - Scene switcher UI
media-panel/
  ├── views/text.tsx         📦 NEW - Text creation panel
  ├── views/captions.tsx     📦 NEW - Auto-captions (Phase 2)
  ├── views/stickers.tsx     📦 NEW - (skip for now)
  └── views/sounds.tsx       📦 NEW - (skip for now)
properties-panel/
  └── text-properties.tsx    📦 NEW - Text styling panel
```

---

## 🔄 Consolidation Strategy

### Decision 1: Scene Store
**Question:** Separate store OR enhance project-store?

**Upstream approach:** Separate `scene-store.ts` (318 lines)
- Manages scene CRUD operations
- Syncs with project-store
- Handles scene switching + timeline loading
- Uses storageService (their DB)

**Our situation:**
- We use IPFS for storage (not their DB)
- Project-store already manages project state
- Scenes are "project subdivisions"

**DECISION: Create Minimal Scene Store** ✅
**Rationale:**
- Scene lifecycle is complex (create/delete/switch/persist)
- Scenes need to sync with timeline state
- Keep separation of concerns (project ≠ scene)
- But adapt their storage logic for our IPFS architecture

**Consolidation plan:**
1. Copy scene-store.ts as base
2. Replace `storageService` calls with our project persistence
3. Remove database-specific code
4. Keep scene management logic
5. Ensure compatibility with our template system

**Estimated size:** ~150 lines (remove DB code, simplify)

---

### Decision 2: Text Properties Store
**Question:** Separate store OR enhance timeline-store?

**Upstream approach:** Separate `text-properties-store.ts`
- Manages text editing state
- Font, color, size, alignment
- Text animations
- Active text element selection

**Our situation:**
- Timeline-store manages clips/elements
- No text support currently

**DECISION: Create Minimal Text Store** ✅
**Rationale:**
- Text editing has unique state (font, color, etc.)
- Text properties are independent of timeline
- Keeps timeline-store focused on timing
- Can lazy-load text editor dependencies

**Consolidation plan:**
1. Extract essential text state only
2. Skip complex animations initially (add later)
3. Limit font choices (5-10 essential fonts)
4. Use shared color picker if we have one
5. No bloat - MVP text features only

**Estimated size:** ~100 lines

---

### Decision 3: Media Panel Restructure
**Question:** Rebuild with tabs OR keep single view?

**Upstream approach:** Tabbed panel with BaseView pattern
- Tab bar for switching views
- Media, Text, Stickers, Sounds, Captions tabs
- PanelBaseView component for consistency

**Our situation:**
- Current media-panel is single view
- Need to add text panel
- Will add captions later (Phase 2)

**DECISION: Implement Minimal Tabs** ✅
**Rationale:**
- Need tabs for Media + Text (minimum)
- Prepare for future: Captions, Stickers
- Keep it simple - just 2 tabs initially
- Don't over-engineer

**Consolidation plan:**
1. Create simple tab system (2 tabs: Media, Text)
2. Reuse existing Tabs UI component
3. Keep current media view as "Media" tab
4. Add new text view as "Text" tab
5. Don't create BaseView pattern yet (YAGNI)

**Estimated work:** ~50 lines (tab wrapper)

---

## 🎯 Phase 1 Merge Plan

### Step 2.1: Adapt Scene Store (Priority: HIGH)
**Files to create/modify:**
- `✨ NEW: /stores/scene-store.ts` (~150 lines)
- `🔧 MODIFY: /stores/project-store.ts` (add scene support)
- `🔧 MODIFY: /stores/timeline-store.ts` (per-scene timelines)
- `🔧 MODIFY: /types/...` (Scene type definitions)

**Changes:**
```typescript
// scene-store.ts - Our adapted version
export interface Scene {
  id: string;
  name: string;
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Skip: isBackground, complex metadata
// Add: IPFS CID for scene data (if needed)
```

**Key adaptations:**
- Remove storageService dependency
- Use our project persistence (IPFS)
- Simplify scene metadata
- Ensure template compatibility

**Consolidation opportunities:**
- Reuse existing UUID generation
- Share project save logic
- Consolidate scene/project updates

---

### Step 2.2: Scenes UI Component (Priority: HIGH)
**Files to create:**
- `✨ NEW: /components/editor/scenes-view.tsx` (~200 lines)
- `🔧 MODIFY: /components/editor/timeline.tsx` (add scene button)

**Mobile-first requirements:**
- Bottom sheet for scene selection (not dropdown)
- Touch-friendly scene cards
- Swipe to delete scenes
- Long-press to rename
- Haptic feedback

**Consolidation:**
- Reuse existing Sheet component
- Reuse Button/Input components
- Follow our UI patterns

---

### Step 3.1: Text Store (Priority: HIGH)
**Files to create:**
- `✨ NEW: /stores/text-properties-store.ts` (~100 lines)
- `🔧 MODIFY: /types/...` (TextElement type)

**Essential features only:**
```typescript
// Minimal text state
interface TextProperties {
  content: string;
  fontSize: number;      // 12-72px
  fontFamily: string;    // 5 fonts max
  color: string;         // hex color
  position: { x: number; y: number };
  // Skip: complex animations, gradients, etc.
}
```

---

### Step 3.2: Text Panel (Priority: HIGH)
**Files to create:**
- `✨ NEW: /components/editor/media-panel/text-panel.tsx` (~150 lines)
- `🔧 MODIFY: /components/editor/media-panel.tsx` (add tabs)

**Features:**
- Text input area
- Add text button
- Basic presets (3-5 common styles)
- Mobile-optimized keyboard handling

---

### Step 3.3: Text Properties Panel (Priority: HIGH)
**Files to create:**
- `✨ NEW: /components/editor/properties-panel/text-properties.tsx` (~100 lines)
- `🔧 MODIFY: /components/editor/properties-panel.tsx` (add text mode)

**Features:**
- Font picker (dropdown)
- Size slider
- Color picker (reuse existing)
- Position controls
- Delete button

---

### Step 3.4: Text Rendering (Priority: HIGH)
**Files to modify:**
- `🔧 MODIFY: /components/editor/preview-panel.tsx` (render text)
- `🔧 MODIFY: /components/editor/timeline.tsx` (text clips)

**Implementation:**
- Render text as absolute positioned divs
- Layer text above video (z-index)
- Sync with timeline playback
- Handle text visibility per timestamp

---

## 📏 Metrics & Validation

### Code Size Targets
- Scene store: ~150 lines (vs 318 upstream)
- Text store: ~100 lines
- Scenes UI: ~200 lines
- Text panel: ~150 lines
- Text properties: ~100 lines
- **Total new code: ~700 lines**
- **Upstream equivalent: ~1500 lines**
- **Reduction: 53% smaller (consolidation success!)**

### Performance Targets
- Scene switching: <100ms
- Text rendering: 60fps
- No memory leaks
- Lazy load text editor

### Compatibility Targets
- ✅ Templates still work
- ✅ Web3/Zora unaffected
- ✅ IPFS storage intact
- ✅ Existing projects load
- ✅ Mobile-first maintained

---

## ⚠️ Risk Assessment

### HIGH RISK
- Timeline store changes (central to app)
- Project store changes (persistence layer)
- Preview panel rendering (performance)

**Mitigation:**
- Test after each change
- Keep rollback commits ready
- Feature flags for scenes/text

### MEDIUM RISK
- Media panel restructure (UI changes)
- Type system updates (TypeScript)

**Mitigation:**
- Incremental changes
- Type checking at each step

### LOW RISK
- New components (isolated)
- New stores (additive)

---

## 🎯 Success Criteria

### Functional
- [ ] Create scene ✓
- [ ] Switch scene ✓
- [ ] Delete scene ✓
- [ ] Add text element ✓
- [ ] Edit text properties ✓
- [ ] Text renders in preview ✓
- [ ] Text shows on timeline ✓
- [ ] Export with text ✓

### Non-Functional
- [ ] No performance regression
- [ ] Mobile-optimized UI
- [ ] Code follows DRY principles
- [ ] Types are strict
- [ ] Documentation updated

### Compatibility
- [ ] Templates load correctly
- [ ] Web3 features work
- [ ] IPFS storage works
- [ ] Existing projects open

---

## 📅 Implementation Timeline

**Day 1-2:** Scene Store + Types
**Day 3-4:** Scene UI + Integration
**Day 5-6:** Text Store + Types
**Day 7-8:** Text Panel + Properties
**Day 9-10:** Text Rendering + Timeline
**Day 11-12:** Testing + Refinement
**Day 13-14:** Documentation + Cleanup

---

## 🚀 Next Steps

1. ✅ Audit complete
2. → Extract Scene types from upstream
3. → Create minimal Scene store
4. → Implement Scene UI
5. → Add Text support

**Ready to proceed with Step 2.1: Scene Store Integration**
