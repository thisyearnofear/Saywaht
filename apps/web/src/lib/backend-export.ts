import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { ExportOptions } from "./canvas-export-utils";
import { FORMAT_DIMENSIONS } from "./video-utils";

// Backend export service configuration
// Try multiple possible backend URLs
const BACKEND_URLS = [
  process.env.NEXT_PUBLIC_BACKEND_EXPORT_URL,
  'http://157.180.36.156:3001', // FFmpeg service on port 3001
  'http://157.180.36.156:3100', // Legacy port
  'http://localhost:3001', // Local development
  'http://localhost:3100'  // Local development legacy
].filter(Boolean) as string[];

let cachedBackendUrl: string | null = null;

/**
 * Get the working backend URL with automatic fallback detection
 */
async function getBackendUrl(): Promise<string> {
  // Return cached URL if we've already found a working one
  if (cachedBackendUrl) {
    return cachedBackendUrl;
  }

  // Try each URL until we find one that responds
  for (const url of BACKEND_URLS) {
    try {
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout per URL
      });
      
      if (response.ok) {
        cachedBackendUrl = url;
        console.log(`✅ Backend service found at: ${url}`);
        return url;
      }
    } catch (err) {
      // This URL didn't work, try the next one
      continue;
    }
  }

  // No working URL found, default to first configured URL
  console.warn('⚠️ Could not detect working backend URL, using default');
  return BACKEND_URLS[0] || 'http://157.180.36.156:3001';
}

export interface BackendExportOptions extends ExportOptions {
  maxFileSizeMB?: number;
  timeout?: number; // in milliseconds
}

export interface BackendJobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BackendExportResult {
  blob: Blob;
  jobId: string;
  stats: {
    processingTime: number;
    fileSize: number;
    method: 'backend';
  };
}

/**
 * Main backend export function
 * Uploads timeline data and media files to backend service for processing
 */
export const exportVideoBackend = async (
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: BackendExportOptions = { format: 'landscape', quality: 'high' }
): Promise<BackendExportResult> => {
  const startTime = performance.now();
  
  try {
    console.log('⚡ Starting Pro Export for best quality...');
    
    // Get the working backend URL
    const BACKEND_URL = await getBackendUrl();
    
    // Prepare export options
    const dimensions = FORMAT_DIMENSIONS[options.format];
    const exportOptions = {
      width: dimensions.width,
      height: dimensions.height,
      frameRate: options.frameRate || 30,
      outputFormat: options.outputFormat || "mp4",
      maxFileSizeMB: options.maxFileSizeMB || 50,
      ...options
    };

    // Create FormData for multipart upload
    const formData = new FormData();
    
    // Add timeline data
    formData.append('timelineData', JSON.stringify({
      tracks,
      mediaItems: mediaItems.map(item => ({
        ...item,
        // Convert File objects to URLs for backend processing
        url: item.file instanceof File ? URL.createObjectURL(item.file) : item.url,
        isLocal: item.file instanceof File
      })),
      totalDuration
    }));
    
    // Add export options
    formData.append('exportOptions', JSON.stringify(exportOptions));
    
    // Upload media files that are File objects
    const uploadedFiles: string[] = [];
    for (const item of mediaItems) {
      if (item.file instanceof File) {
        formData.append('mediaFiles', item.file, item.name);
        uploadedFiles.push(item.name);
      }
    }
    
    console.log(`📤 Uploading ${uploadedFiles.length} media files for processing...`);
    onProgress(5);
    
    // Start export job
    const response = await fetch(`${BACKEND_URL}/api/export/start`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Backend export failed: ${errorData.error || response.statusText}`);
    }
    
    const { jobId } = await response.json();
    console.log(`✅ Pro Export job started: ${jobId}`);
    
    onProgress(10);
    
    // Poll for completion
    const result = await pollForCompletion(BACKEND_URL, jobId, onProgress, options.timeout);
    
    // Download the completed file
    const blob = await downloadExportedFile(BACKEND_URL, jobId);
    
    const processingTime = performance.now() - startTime;
    
    return {
      blob,
      jobId,
      stats: {
        processingTime,
        fileSize: blob.size,
        method: 'backend'
      }
    };
    
  } catch (error) {
    console.error('❌ Backend export failed:', error);
    throw new Error(`Backend export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Poll backend service for job completion
 */
async function pollForCompletion(
  backendUrl: string,
  jobId: string, 
  onProgress: (progress: number) => void,
  timeout: number = 300000 // 5 minutes default
): Promise<BackendJobStatus> {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${backendUrl}/api/export/status/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }
      
      const status: BackendJobStatus = await response.json();
      
      // Update progress
      onProgress(Math.max(10, status.progress)); // Ensure progress doesn't go backwards
      
      console.log(`📊 Job ${jobId}: ${status.status} (${status.progress}%) - ${status.message}`);
      
      if (status.status === 'completed') {
        onProgress(100);
        return status;
      }
      
      if (status.status === 'failed') {
        throw new Error(status.error || 'Export failed on backend');
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error) {
      console.error('❌ Error polling job status:', error);
      throw error;
    }
  }
  
  throw new Error(`Export timeout: Job ${jobId} did not complete within ${timeout}ms`);
}

/**
 * Download the exported file from backend
 */
async function downloadExportedFile(backendUrl: string, jobId: string): Promise<Blob> {
  try {
    const response = await fetch(`${backendUrl}/api/export/download/${jobId}`);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`📥 Downloaded export: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
    
    return blob;
    
  } catch (error) {
    console.error('❌ Error downloading exported file:', error);
    throw error;
  }
}

/**
 * Check if backend export service is available
 */
export async function isBackendExportAvailable(): Promise<boolean> {
  try {
    const backendUrl = await getBackendUrl();
    const response = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (!response.ok) return false;
    
    const health = await response.json();
    return health.status === 'healthy';
    
  } catch (error) {
    console.warn('Backend export service not available:', error);
    return false;
  }
}

/**
 * Get backend service health information
 */
export async function getBackendExportHealth(): Promise<any> {
  const backendUrl = await getBackendUrl();
  const response = await fetch(`${backendUrl}/api/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }
  return response.json();
}
