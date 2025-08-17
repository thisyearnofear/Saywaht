# Video Export User Guide

## Overview

SayWhat offers multiple video export methods to ensure the best possible experience for all users and content types. The system automatically selects the optimal export method, but you can also manually choose your preferred method.

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
