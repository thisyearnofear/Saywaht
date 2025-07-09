"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileVideo, FileAudio, FileImage, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { groveStorage, type GroveUploadResult } from "@/lib/grove-storage";
import { toast } from "sonner";

interface GroveUploadProps {
  onUploadComplete: (result: GroveUploadResult) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
}

export function GroveUpload({
  onUploadComplete,
  accept = {
    "video/*": [".mp4", ".webm", ".mov", ".avi"],
    "audio/*": [".mp3", ".wav", ".ogg", ".m4a"],
    "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  },
  maxFiles = 1,
  maxSize = 8 * 1024 * 1024, // 8MB Grove limit
}: GroveUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<GroveUploadResult[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const results: GroveUploadResult[] = [];

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        
        // Check file size
        if (file.size > maxSize) {
          throw new Error(`File ${file.name} is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
        }

        setProgress((i / acceptedFiles.length) * 50); // First 50% for upload start

        const result = await groveStorage.uploadFile(file);
        results.push(result);

        setProgress(((i + 1) / acceptedFiles.length) * 100);

        // Call the callback for each file
        onUploadComplete(result);
        
        toast.success(`Uploaded ${file.name} to IPFS`);
      }

      setUploadedFiles(prev => [...prev, ...results]);
      setProgress(100);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      // Reset progress after a delay
      setTimeout(() => setProgress(0), 2000);
    }
  }, [onUploadComplete, maxSize]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    disabled: uploading,
  });

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) return FileVideo;
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return FileAudio;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return FileImage;
    return Upload;
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
          ${uploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          
          <div className="text-sm">
            {uploading ? (
              <span>Uploading to IPFS...</span>
            ) : isDragActive ? (
              <span>Drop files here</span>
            ) : (
              <span>
                <strong>Click to upload</strong> or drag and drop
              </span>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            Video, audio, or image files up to {maxSize / 1024 / 1024}MB
          </div>
        </div>
      </div>

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-center text-muted-foreground">
            {progress < 50 ? "Uploading to Grove..." : "Propagating to IPFS..."}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {fileRejections.map(({ file, errors }) => (
              <div key={file.name}>
                {file.name}: {errors.map(e => e.message).join(", ")}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Recently Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Recently uploaded:</div>
          {uploadedFiles.slice(-3).map((file) => {
            const Icon = getFileIcon(file.filename);
            return (
              <div key={file.storageKey} className="flex items-center gap-2 text-xs p-2 bg-muted/30 rounded">
                <Icon className="h-3 w-3" />
                <span className="flex-1 truncate">{file.filename}</span>
                <CheckCircle className="h-3 w-3 text-green-500" />
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span>Decentralized storage via IPFS</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          <span>No private keys required</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
          <span>Powered by Grove</span>
        </div>
      </div>
    </div>
  );
}
