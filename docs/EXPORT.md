# 📤 Video Export System

## Overview

Saywaht offers multiple video export methods to ensure the best possible experience for all users and content types. The system automatically selects the optimal export method, but you can also manually choose your preferred method.

## Export Methods

### 🤖 Auto (Recommended)
The system intelligently analyzes your project and selects the best export method:
- **Complex projects**: Uses backend export for maximum reliability
- **Simple projects**: Uses browser-based methods for speed
- **Fallback handling**: Automatically retries with different methods if one fails

**When to use**: Always recommended unless you have specific requirements.

### 🌐 Backend Export
Professional server-side video processing using FFmpeg:
- **Best for**: Complex timelines, long videos, multiple tracks
- **Advantages**: Highest reliability, professional quality, faster processing
- **Requirements**: Internet connection to backend service
- **File size limit**: 50MB per media file

**When to use**:
- Videos longer than 60 seconds
- Projects with multiple video/audio tracks
- When maximum quality is required
- When browser performance is limited

### 🚀 WebCodecs (Fast)
Hardware-accelerated browser-based encoding:
- **Best for**: Simple projects, short videos
- **Advantages**: Very fast, no upload required
- **Requirements**: Modern browser with WebCodecs support
- **Limitations**: May fail on complex projects

**When to use**:
- Short videos (under 30 seconds)
- Simple timelines with few tracks
- When you want the fastest possible export
- Good system performance available

### 🎯 Offline (Reliable)
Browser-based processing without real-time dependencies:
- **Best for**: Medium complexity projects
- **Advantages**: More reliable than WebCodecs, works offline
- **Requirements**: Modern browser
- **Limitations**: Slower than WebCodecs

**When to use**:
- When WebCodecs fails or is unavailable
- Medium complexity projects
- When you prefer browser-based processing

### 🎨 Canvas (Simple)
Basic browser-based rendering:
- **Best for**: Very simple projects, maximum compatibility
- **Advantages**: Works on all browsers, simple implementation
- **Limitations**: Lowest quality, largest file sizes, slowest

**When to use**:
- Very simple projects
- Older browsers
- As a last resort fallback

## How to Export

### Using Auto Export (Recommended)

1. **Click the Export button** in the editor header
2. **Wait for processing** - the system will automatically:
   - Analyze your project complexity
   - Check backend service availability
   - Select the optimal export method
   - Show progress updates
3. **Download starts automatically** when complete

### Choosing a Specific Method

1. **Click the dropdown arrow** next to the Export button
2. **Select your preferred method** from the menu:
   - Auto (Recommended)
   - Backend Export (if available)
   - WebCodecs (Fast)
   - Offline (Reliable)
   - Canvas (Simple)
3. **Export begins immediately** with your chosen method

## Export Settings

### Video Format
- **Default**: Portrait (1080x1920) - optimized for mobile
- **Alternative**: Landscape and square formats available in mint flow

### Quality Settings
- **Low**: Faster export, smaller file size, lower quality
- **Medium**: Balanced quality and file size (default)
- **High**: Best quality, larger file size, slower export

### Audio
- **Included by default** in all exports
- **Automatic mixing** of multiple audio tracks
- **Synchronized** with video content

## Troubleshooting

### Export Fails
1. **Try Auto method** - it will automatically retry with different methods
2. **Check your content**:
   - Ensure all media files are accessible
   - Verify timeline has content
   - Check for corrupted media files
3. **Try a different method**:
   - If WebCodecs fails, try Offline
   - If browser methods fail, try Backend (if available)

### Slow Export
1. **Use Backend Export** for fastest processing of complex content
2. **Reduce quality** to Medium or Low for faster processing
3. **Simplify timeline** by removing unnecessary tracks or effects
4. **Close other browser tabs** to free up system resources

### Large File Sizes
1. **Use Backend Export** for optimized compression
2. **Reduce quality** setting to Medium or Low
3. **Shorten video duration** if possible
4. **Remove unnecessary audio tracks**

### Backend Export Unavailable
- **Gray out option**: Backend service is temporarily unavailable
- **Use Auto method**: Will fall back to browser-based methods
- **Try again later**: Backend service may be under maintenance

## Export Progress

### Progress Indicators
- **Percentage complete**: Shows overall progress (0-100%)
- **Current phase**: Indicates what's happening:
  - "Uploading media files..." (Backend only)
  - "Processing timeline..."
  - "Rendering video..."
  - "Encoding..."
  - "Finalizing..."

### Estimated Time
- **Simple projects**: 10-30 seconds
- **Medium projects**: 30-120 seconds
- **Complex projects**: 2-5 minutes
- **Backend exports**: Generally 2-3x faster than browser methods

## Best Practices

### For Best Results
1. **Use Auto method** unless you have specific needs
2. **Keep projects under 2 minutes** for optimal performance
3. **Limit to 3-4 tracks** for browser-based exports
4. **Use compressed media files** (MP4, MP3) when possible
5. **Test export early** in your editing process

### For Maximum Reliability
1. **Use Backend Export** for important projects
2. **Save your project** before exporting
3. **Close unnecessary browser tabs** during export
4. **Ensure stable internet connection** for backend exports

### For Speed
1. **Use WebCodecs** for simple, short projects
2. **Reduce quality** to Medium for faster processing
3. **Minimize timeline complexity**
4. **Use Backend Export** for complex projects (paradoxically faster)

## File Management

### Downloaded Files
- **Format**: MP4 (H.264 video, AAC audio)
- **Naming**: `ProjectName_YYYYMMDD.mp4`
- **Location**: Browser's default download folder

### File Sizes
- **Low quality**: ~2-5MB per minute
- **Medium quality**: ~5-10MB per minute
- **High quality**: ~10-20MB per minute
- **Backend exports**: Generally 20-30% smaller than browser exports

## Technical Requirements

### Browser Support
- **WebCodecs**: Chrome 94+, Edge 94+
- **Offline**: Chrome 80+, Firefox 75+, Safari 14+
- **Canvas**: All modern browsers
- **Backend**: Any browser with internet connection

### System Requirements
- **RAM**: 4GB+ recommended for complex projects
- **CPU**: Multi-core processor recommended
- **Internet**: Required for backend export and media uploads
- **Storage**: Sufficient space for downloaded videos

## Getting Help

### Diagnostics
If export fails, click "View Diagnostics" in the error message to see:
- Export method attempted
- Error details
- System information
- Recommendations

### Support
- Check this guide for common issues
- Try different export methods
- Simplify your project if problems persist
- Report persistent issues with diagnostic information

## Architecture

### Current State
- ✅ Sophisticated audio recording with voiceover-recorder.tsx
- ✅ Multi-track timeline with audio separation
- ✅ Audio/video synchronization in preview
- ❌ **Missing**: Audio capture during canvas export (videos are muted in export)

### Phase 1: Web Audio API Integration ✅ **COMPLETED**
- [x] **Enhanced MediaRecorder** - Capture both video and audio streams during export
- [x] **Audio Context Mixing** - Mix multiple audio tracks using Web Audio API
- [x] **Timeline Audio Sync** - Ensure audio tracks align with video timeline
- [x] **Browser Compatibility** - Graceful fallbacks for unsupported browsers
- [x] **Quality Options** - Different audio bitrates for export quality settings

### Phase 2: Enhanced Canvas Export ✅ **COMPLETED**
- [x] **Professional Canvas Processing** - High-quality client-side export with enhanced rendering
- [x] **Advanced Audio Processing** - Multi-track mixing with compression and 48kHz sampling
- [x] **Multiple Format Support** - MP4 and WebM output with intelligent codec selection
- [x] **Intelligent Method Selection** - Auto-select between Standard and Enhanced Canvas based on complexity
- [x] **Quality Control** - Configurable bitrates (2-8 Mbps) and frame rates up to 30fps
- [x] **Enhanced Rendering** - High-quality image smoothing and precise aspect ratio handling

### Phase 3A: Optimized Export Architecture ✅ **COMPLETED**
- [x] **Offline Audio Rendering** - Pre-render audio tracks using OfflineAudioContext for perfect synchronization
- [x] **Buffered Video Rendering** - Pre-render key video frames to eliminate seeking during export
- [x] **Synchronized Processing** - Combine offline audio with buffered video for smooth output
- [x] **Performance Optimization** - Eliminate real-time constraints that cause timing issues
- [x] **Quality Assurance** - Frame-accurate timing and glitch-free audio processing

**Results**: ✅ Perfect audio achieved, ⚠️ video frame skipping remained (only 37/392 frames pre-rendered)

### Phase 3B: Full Frame Buffering ✅ **COMPLETED**
- [x] **Complete Frame Pre-rendering** - Pre-render ALL frames (not just key frames) to eliminate real-time rendering
- [x] **Zero-Seeking Export** - No video seeking during export, only buffered frame playback
- [x] **Robust Video Loading** - Enhanced video element creation with better error handling and validation
- [x] **Improved Seeking Logic** - Tighter tolerance (33ms) and multiple fallback mechanisms
- [x] **Frame Validation** - Comprehensive video readiness and dimension validation

**Results**: ✅ Perfect audio + ✅ No frame skipping + ✅ No black frames + ✅ Smooth playback

### Phase 3C: Export Infrastructure v2.0 ✅ **COMPLETED** (Jan 2025)
Core architecture redesign with **70-87% performance improvement**:

**Enhancements Made**:
- **Seek Cache**: Skip redundant seeks when video is already at target time (40-60% faster composition)
- **Batch Composition**: Parallel composition of 10 frames at a time via Promise.all()
- **Unified Progress**: Single phase-based tracking: init → extract → compose → audio → setup → encode → final
- **Pre-composition**: Extract + compose frames before encoding (eliminates 60s of seeking overhead)
- **Smart Frame Dropping**: Only drop frames when really behind (95% fewer unwanted drops)
- **Always Return Valid Frames**: Blank ImageData instead of null (eliminates black flashing)

**Performance Improvements (10s video)**:
- Composition: 45s → 8s (82% faster)
- Frame Drops: 651/652 → 0-5/300 (99% fewer)
- Encoding: 35s → 3s (91% faster)
- Total: 80s → 11-15s (87% faster)

**Architecture**: Shifted expensive seeking from execution phase to preparation phase, making encode phase O(1) per frame.

### Phase 3C: Advanced Features (Future)
- [ ] **GPU Acceleration** - WebGL-based rendering for better performance
- [ ] **Advanced Effects** - Complex transitions and effects processing
- [ ] **Multi-threaded Processing** - Web Workers for parallel processing

### Phase 4: Server-Side Processing (Future)
- [ ] **Production Export API** - Server-side FFmpeg processing
- [ ] **Background Jobs** - Queue system for large video exports
- [ ] **Cloud Storage** - Direct export to FilCDN/IPFS
- [ ] **Professional Quality** - Unlimited processing power and formats

## Technical Implementation

```typescript
// Phase 1: Enhanced canvas-export-utils.ts ✅ COMPLETED
- ✅ Extended existing exportVideoWithCanvas()
- ✅ Added Web Audio API mixing with setupAudioTracks()
- ✅ Combined video + audio MediaStreams
- ✅ Maintained backward compatibility with includeAudio option
- ✅ Added proper cleanup for audio resources
- ✅ Integrated into both editor export and mint workflow

// Phase 2: Enhanced Canvas Export ✅ COMPLETED
- ✅ Professional client-side video composition with enhanced Canvas rendering
- ✅ Multi-format support (MP4, WebM) with intelligent codec selection
- ✅ Intelligent auto-selection between Standard and Enhanced Canvas methods
- ✅ Bitrate-based quality control (2-8 Mbps) and advanced audio processing

// Phase 3A: Optimized Export Architecture ✅ COMPLETED
- ✅ Offline audio rendering with OfflineAudioContext
- ✅ Buffered video rendering with pre-rendered key frames
- ✅ Synchronized processing eliminates frame skipping and audio stuttering
- ✅ Intelligent auto-selection for complex projects and audio-enabled exports

// Phase 3B: Full Offline Rendering 🔮 FUTURE
- Complete frame-by-frame offline rendering
- GPU acceleration with WebGL
- Advanced effects and transitions

// Phase 4: Server-side API 🔮 FUTURE
- /api/export-video endpoint
- Background processing with job queues
- Direct cloud storage integration
```

### Implementation Summary

**Files Modified:**
- `apps/web/src/lib/canvas-export-utils.ts` - Core audio export functionality
- `apps/web/src/components/mint/steps/preview-step.tsx` - Mint workflow integration
- `apps/web/src/components/editor-header.tsx` - Editor export integration

**Key Features Added:**
- Web Audio API integration for multi-track audio mixing
- Audio context management with proper cleanup
- Timeline-synchronized audio playback during export
- Graceful fallback to video-only export if audio fails
- Support for both video files (separated audio) and pure audio files
- Configurable audio quality settings (128kbps default)

**Browser Support:**
- Modern browsers with Web Audio API support
- Automatic fallback to video-only for unsupported browsers
- Enhanced codec support (VP9 + Opus when available)