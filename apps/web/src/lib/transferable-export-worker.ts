import { isWebCodecsAvailable, getWebCodecsAPI } from "./webcodecs-types";

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
const videoChunks: Uint8Array[] = [];
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
  
  if (!isWebCodecsAvailable()) {
    throw new Error('WebCodecs API not available in worker');
  }

  const { VideoEncoder } = getWebCodecsAPI();
  
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

  // Configure encoder based on output format
  const codec = config.outputFormat === 'mp4' ? 'avc1.42E01E' : 'vp8';
  
  encoderConfig = {
    codec,
    width: config.width,
    height: config.height,
    bitrate: config.bitrate,
    framerate: config.frameRate,
  };

  if (codec.startsWith('avc1')) {
    encoderConfig.avc = { format: 'avc' };
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
  // Note: VideoFrame constructor might not be available in all workers
  // We need to check and handle this
  try {
    const VideoFrame = (self as any).VideoFrame;
    if (!VideoFrame) {
      throw new Error('VideoFrame not available in worker');
    }

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
  } catch (error) {
    console.error('Failed to create/encode VideoFrame:', error);
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
  // Create OffscreenCanvas
  const canvas = new OffscreenCanvas(frameData.width, frameData.height);
  const ctx = canvas.getContext('2d');
  
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
  
  // For proper MP4/WebM, we'd need a muxer here
  // For now, create a simple blob
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