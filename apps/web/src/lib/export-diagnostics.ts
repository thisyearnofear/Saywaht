import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";

export interface ExportDiagnostics {
  timestamp: number;
  exportMethod: string;
  duration: number;
  progress: number;
  error?: string;
  systemInfo: {
    userAgent: string;
    memory?: number;
    cores?: number;
    webCodecsSupported: boolean;
  };
  contentInfo: {
    tracks: number;
    clips: number;
    hasVideo: boolean;
    hasAudio: boolean;
    totalDuration: number;
  };
  performanceMetrics: {
    startTime: number;
    endTime?: number;
    elapsedTime?: number;
    framesProcessed?: number;
    fps?: number;
  };
}

class ExportDiagnosticsCollector {
  private diagnostics: ExportDiagnostics[] = [];
  private currentExport: ExportDiagnostics | null = null;
  private progressUpdateInterval: NodeJS.Timeout | null = null;

  startExport(
    method: string,
    tracks: TimelineTrack[],
    mediaItems: MediaItem[],
    totalDuration: number
  ): void {
    // Clean up any previous export tracking
    this.stopExport();

    const hasVideo = tracks.some(track =>
      track.clips.some(clip => {
        const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
        return mediaItem?.type === "video";
      })
    );

    const hasAudio = tracks.some(track =>
      track.clips.some(clip => {
        const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
        return mediaItem?.type === "audio" || (mediaItem?.type === "video" && !track.muted);
      })
    );

    const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);

    this.currentExport = {
      timestamp: Date.now(),
      exportMethod: method,
      duration: totalDuration,
      progress: 0,
      systemInfo: {
        userAgent: navigator.userAgent,
        memory: (navigator as any).deviceMemory,
        cores: navigator.hardwareConcurrency,
        webCodecsSupported: this.checkWebCodecsSupport()
      },
      contentInfo: {
        tracks: tracks.length,
        clips: totalClips,
        hasVideo,
        hasAudio,
        totalDuration
      },
      performanceMetrics: {
        startTime: performance.now()
      }
    };

    // Start progress monitoring
    this.progressUpdateInterval = setInterval(() => {
      if (this.currentExport) {
        const elapsed = performance.now() - this.currentExport.performanceMetrics.startTime;
        console.log(`Export progress: ${this.currentExport.progress.toFixed(1)}% (${(elapsed / 1000).toFixed(1)}s)`);
        
        // Detect if export is stuck
        if (elapsed > 30000 && this.currentExport.progress < 95 && this.currentExport.progress > 85) {
          console.warn("⚠️ Export appears to be stuck at", this.currentExport.progress + "%");
        }
      }
    }, 2000);
  }

  updateProgress(progress: number): void {
    if (this.currentExport) {
      this.currentExport.progress = progress;
    }
  }

  recordError(error: Error | string): void {
    if (this.currentExport) {
      this.currentExport.error = error instanceof Error ? error.message : error;
    }
  }

  stopExport(success: boolean = true): void {
    if (this.currentExport) {
      const endTime = performance.now();
      this.currentExport.performanceMetrics.endTime = endTime;
      this.currentExport.performanceMetrics.elapsedTime = 
        endTime - this.currentExport.performanceMetrics.startTime;

      if (!success && !this.currentExport.error) {
        this.currentExport.error = "Export failed or was cancelled";
      }

      // Save to diagnostics history
      this.diagnostics.push(this.currentExport);
      
      // Keep only last 10 exports
      if (this.diagnostics.length > 10) {
        this.diagnostics = this.diagnostics.slice(-10);
      }

      // Save to session storage for debugging
      try {
        sessionStorage.setItem('export_diagnostics', JSON.stringify(this.diagnostics));
      } catch (e) {
        console.warn("Could not save export diagnostics:", e);
      }

      this.currentExport = null;
    }

    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = null;
    }
  }

  private checkWebCodecsSupport(): boolean {
    return typeof (window as any).VideoEncoder !== 'undefined' &&
           typeof (window as any).VideoDecoder !== 'undefined';
  }

  getLastExportDiagnostics(): ExportDiagnostics | null {
    return this.diagnostics[this.diagnostics.length - 1] || null;
  }

  getAllDiagnostics(): ExportDiagnostics[] {
    return [...this.diagnostics];
  }

  generateReport(): string {
    const last = this.getLastExportDiagnostics();
    if (!last) return "No export diagnostics available";

    let report = "=== Export Diagnostics Report ===\n\n";
    
    report += `Last Export:\n`;
    report += `- Method: ${last.exportMethod}\n`;
    report += `- Progress: ${last.progress}%\n`;
    report += `- Duration: ${last.duration}s\n`;
    report += `- Status: ${last.error ? 'Failed' : 'Success'}\n`;
    if (last.error) {
      report += `- Error: ${last.error}\n`;
    }
    
    report += `\nContent:\n`;
    report += `- Tracks: ${last.contentInfo.tracks}\n`;
    report += `- Clips: ${last.contentInfo.clips}\n`;
    report += `- Has Video: ${last.contentInfo.hasVideo}\n`;
    report += `- Has Audio: ${last.contentInfo.hasAudio}\n`;
    
    report += `\nPerformance:\n`;
    if (last.performanceMetrics.elapsedTime) {
      report += `- Export Time: ${(last.performanceMetrics.elapsedTime / 1000).toFixed(1)}s\n`;
      const speed = last.duration / (last.performanceMetrics.elapsedTime / 1000);
      report += `- Speed: ${speed.toFixed(2)}x realtime\n`;
    }
    
    report += `\nSystem:\n`;
    report += `- WebCodecs: ${last.systemInfo.webCodecsSupported ? 'Supported' : 'Not Supported'}\n`;
    report += `- Memory: ${last.systemInfo.memory || 'Unknown'}GB\n`;
    report += `- CPU Cores: ${last.systemInfo.cores || 'Unknown'}\n`;
    
    // Recent failure analysis
    const recentFailures = this.diagnostics.filter(d => d.error).slice(-5);
    if (recentFailures.length > 0) {
      report += `\nRecent Failures (${recentFailures.length}):\n`;
      recentFailures.forEach((failure, i) => {
        report += `${i + 1}. ${failure.exportMethod} - ${failure.error} (${failure.progress}%)\n`;
      });
    }
    
    return report;
  }

  // Debug helper to simulate stuck export
  simulateStuckExport(): void {
    console.warn("🔧 Simulating stuck export at 90%...");
    this.startExport("test", [], [], 10);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      this.updateProgress(progress);
      
      if (progress >= 90) {
        clearInterval(interval);
        console.warn("🔧 Export simulation stuck at 90%");
      }
    }, 500);
  }
}

// Global instance
export const exportDiagnostics = new ExportDiagnosticsCollector();

// Console helper for debugging
if (typeof window !== 'undefined') {
  (window as any).exportDiagnostics = {
    getReport: () => console.log(exportDiagnostics.generateReport()),
    getLastExport: () => exportDiagnostics.getLastExportDiagnostics(),
    getAllExports: () => exportDiagnostics.getAllDiagnostics(),
    simulateStuck: () => exportDiagnostics.simulateStuckExport()
  };
  
  console.log("💡 Export diagnostics available in console:");
  console.log("- exportDiagnostics.getReport() - View diagnostic report");
  console.log("- exportDiagnostics.getLastExport() - Get last export details");
  console.log("- exportDiagnostics.getAllExports() - Get all export history");
  console.log("- exportDiagnostics.simulateStuck() - Simulate stuck export");
}