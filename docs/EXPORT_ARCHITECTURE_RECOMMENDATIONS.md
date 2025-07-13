# Video Export Architecture Recommendations

## Current Issues

### Frame Skipping & Audio Stuttering Problems:

1. **Real-time synchronization**: Trying to sync video seeking + audio playback during live recording
2. **Browser timing inconsistencies**: `requestAnimationFrame` and audio seeking have unpredictable timing
3. **MediaRecorder limitations**: Recording live streams while manipulating them causes timing drift
4. **Memory pressure**: Large canvas operations with frequent seeking degrade performance
5. **Audio/Video desync**: Separate processing leads to synchronization issues

## Recommended Solution: Offline Rendering Architecture

### Phase 3: Pre-Processing + Frame-by-Frame Rendering

```typescript
interface OfflineRenderingPipeline {
  1. Pre-process all media assets
  2. Extract audio tracks to AudioBuffers
  3. Render video frames offline with precise timing
  4. Combine audio + video using Web Audio API offline rendering
  5. Encode final output
}
```

## Implementation Strategy

### 1. Media Pre-Processing

```typescript
// Pre-load and decode all media assets
const preprocessedAssets = await Promise.all([
  loadVideoAsImageSequence(videoFile),
  decodeAudioToBuffer(audioFile),
  optimizeImageAssets(imageFiles),
]);
```

### 2. Offline Audio Rendering

```typescript
// Use OfflineAudioContext for perfect audio timing
const offlineContext = new OfflineAudioContext(
  2,
  sampleRate * duration,
  sampleRate
);
const renderedAudio = await offlineContext.startRendering();
```

### 3. Frame-by-Frame Video Rendering

```typescript
// Render each frame independently without real-time constraints
for (let frame = 0; frame < totalFrames; frame++) {
  const timestamp = frame / frameRate;
  const frameData = await renderFrameAtTime(timestamp);
  videoFrames.push(frameData);
}
```

### 4. Final Assembly

```typescript
// Combine pre-rendered audio + video
const finalVideo = await assembleVideoWithAudio(videoFrames, renderedAudio);
```

## Technical Benefits

### Performance Improvements:

- **No real-time constraints**: Each frame rendered at optimal speed
- **Perfect synchronization**: Audio and video processed with identical timing
- **Memory efficiency**: Process in chunks, not all at once
- **Predictable quality**: No dropped frames or timing issues

### Quality Improvements:

- **Frame-accurate timing**: Every frame rendered at exact timestamp
- **High-quality audio**: Offline rendering eliminates glitches
- **Consistent output**: No browser timing variations
- **Professional codecs**: Better encoding options

## Implementation Priority

### Immediate (Phase 3A): Audio-First Approach

1. Implement offline audio rendering
2. Fix audio synchronization issues
3. Keep current video rendering temporarily

### Medium-term (Phase 3B): Full Offline Rendering

1. Implement frame-by-frame video rendering
2. Pre-process video assets to image sequences
3. Combine offline audio + video rendering

### Long-term (Phase 3C): Advanced Features

1. GPU-accelerated rendering (WebGL)
2. Multi-threaded processing (Web Workers)
3. Progressive encoding for large files

## Alternative: FFmpeg.wasm Revisited

### If Build Issues Can Be Resolved:

- **Professional codecs**: H.264, AAC, etc.
- **Frame-perfect timing**: No browser timing issues
- **Industry-standard quality**: Professional video processing
- **Advanced features**: Filters, effects, transitions

### Build Issue Solutions:

1. **Vite/Webpack 5 compatibility**: Update build configuration
2. **Dynamic imports**: Lazy-load FFmpeg only when needed
3. **Web Worker isolation**: Run FFmpeg in separate thread
4. **CDN delivery**: Load FFmpeg from external CDN

## Recommended Next Steps

### Immediate Actions:

1. **Implement offline audio rendering** (highest impact)
2. **Add frame buffering** to current video system
3. **Optimize memory usage** with chunked processing

### Architecture Decision:

- **Option A**: Full offline rendering (best quality, more complex)
- **Option B**: Hybrid approach (offline audio + improved video)
- **Option C**: FFmpeg.wasm integration (if build issues resolved)

## Code Examples

### Offline Audio Context Implementation:

```typescript
async function renderAudioOffline(tracks: TimelineTrack[], duration: number) {
  const sampleRate = 48000;
  const offlineContext = new OfflineAudioContext(
    2,
    sampleRate * duration,
    sampleRate
  );

  // Process each audio track
  for (const track of tracks) {
    const audioBuffer = await loadAudioBuffer(track.source);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(track.startTime);
  }

  return await offlineContext.startRendering();
}
```

### Frame-by-Frame Video Rendering:

```typescript
async function renderVideoOffline(
  tracks: TimelineTrack[],
  duration: number,
  frameRate: number
) {
  const frames: ImageData[] = [];
  const totalFrames = Math.ceil(duration * frameRate);

  for (let i = 0; i < totalFrames; i++) {
    const timestamp = i / frameRate;
    const frame = await renderFrameAtTimestamp(tracks, timestamp);
    frames.push(frame);
  }

  return frames;
}
```

This architecture would eliminate frame skipping and audio stuttering by removing real-time constraints and ensuring perfect synchronization between audio and video components.
