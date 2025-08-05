interface InitMessage {
  type: 'init';
  payload: {
    width: number;
    height: number;
    frameRate: number;
    bitrate: number;
    outputFormat: 'mp4' | 'webm';
  };
}

interface FrameMessage {
  type: 'frame';
  payload: {
    buffer: ArrayBuffer;
    width: number;
    height: number;
    timestamp: number;
    frameIndex: number;
    isKeyFrame: boolean;
  };
}

interface FinishMessage {
  type: 'finish';
}

type WorkerMessage = InitMessage | FrameMessage | FinishMessage;

let encoder: any = null;
const videoChunks: BlobPart[] = [];
let encoderConfig: any = null;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'init':
        await handleInit(message.payload);
        break;
      
      case 'frame':
        await handleFrame(message.payload);
        break;
        
      case 'finish':
        await handleFinish();
        break;
        
      default:
        throw new Error(`Unknown message type: ${(message as any).type}`);
    }
  } catch (error) {
    console.error('Transferable export worker error:', error);
    self.postMessage({
      type: 'error',
      payload: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

async function handleInit(config: InitMessage['payload']) {
  console.log('🎬 Initializing transferable export worker:', config);
  
  // Check for WebCodecs availability directly in worker context
  if (!('VideoEncoder' in self)) {
    throw new Error('WebCodecs API not available in worker');
  }

  // Access VideoEncoder directly from self
  const VideoEncoder = (self as any).VideoEncoder;
  
  // Create encoder
  encoder = new VideoEncoder({
    output: (chunk: any) => {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      videoChunks.push(data);
    },
    error: (error: Error) => {
      console.error('VideoEncoder error:', error);
      throw error;
    }
  });

  // Configure encoder with optimized settings
  const codec = config.outputFormat === 'mp4' ? 'avc1.42001E' : 'vp8';
  
  encoderConfig = {
    codec,
    width: config.width,
    height: config.height,
    bitrate: config.bitrate,
    framerate: config.frameRate,
    // Add performance optimizations
    latencyMode: 'realtime' as const,
    hardwareAcceleration: 'prefer-hardware' as const,
  };

  if (codec.startsWith('avc1')) {
    encoderConfig.avc = { format: 'avc' };
    // Add H.264 specific optimizations
    encoderConfig.bitrateMode = 'variable' as const;
  }

  encoder.configure(encoderConfig);
  
  // Signal ready
  self.postMessage({ type: 'ready' });
}

async function handleFrame(frameData: FrameMessage['payload']) {
  if (!encoder) {
    throw new Error('Encoder not initialized');
  }

  // Reconstruct ImageData from transferred buffer
  const imageData = new ImageData(
    new Uint8ClampedArray(frameData.buffer),
    frameData.width,
    frameData.height
  );

  // Create VideoFrame from ImageData
  // Check if VideoFrame is available in worker context
  if ('VideoFrame' in self) {
    const VideoFrame = (self as any).VideoFrame;
    const videoFrame = new VideoFrame(imageData, {
      timestamp: frameData.timestamp,
      codedWidth: frameData.width,
      codedHeight: frameData.height,
    });

    // Encode frame
    encoder.encode(videoFrame, {
      keyFrame: frameData.isKeyFrame
    });
    
    // Clean up
    videoFrame.close();
  } else {
    // Fallback: Try using canvas if available
    await encodeUsingCanvas(imageData, frameData);
  }

  // Signal frame processed
  self.postMessage({ type: 'frame_processed' });
}

async function encodeUsingCanvas(
  imageData: ImageData, 
  frameData: FrameMessage['payload']
) {
  // Create OffscreenCanvas with performance optimizations
  const canvas = new OffscreenCanvas(frameData.width, frameData.height);
  const ctx = canvas.getContext('2d', {
    willReadFrequently: false, // We're writing, not reading
    alpha: false // No transparency needed
  });
  
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  // Put image data on canvas
  ctx.putImageData(imageData, 0, 0);

  // Try to create VideoFrame from canvas
  const VideoFrame = (self as any).VideoFrame;
  if (VideoFrame) {
    const videoFrame = new VideoFrame(canvas, {
      timestamp: frameData.timestamp,
    });

    encoder.encode(videoFrame, { 
      keyFrame: frameData.isKeyFrame 
    });
    
    videoFrame.close();
  } else {
    throw new Error('Cannot encode frame: VideoFrame API not available');
  }
}

async function handleFinish() {
  if (!encoder) {
    throw new Error('Encoder not initialized');
  }

  console.log('🏁 Finishing export, flushing encoder...');
  
  // Flush encoder
  await encoder.flush();
  encoder.close();
  encoder = null;

  // Create final blob
  const mimeType = encoderConfig.codec.startsWith('avc') ? 'video/mp4' : 'video/webm';
  
  // Create final blob with proper MIME type
  // Note: For proper MP4/WebM, we'd need a muxer like mp4box.js
  // This creates a raw stream that may not play in all players
  const finalBlob = new Blob(videoChunks, { type: mimeType });
  
  console.log(`✅ Export completed in worker: ${(finalBlob.size / 1024 / 1024).toFixed(2)}MB`);
  
  // Send blob back to main thread
  self.postMessage({
    type: 'success',
    payload: finalBlob
  });
  
  // Clean up
  videoChunks.length = 0;
}

// Handle termination
self.addEventListener('message', (event) => {
  if (event.data.type === 'terminate') {
    if (encoder) {
      encoder.close();
      encoder = null;
    }
    videoChunks.length = 0;
    self.close();
  }
});