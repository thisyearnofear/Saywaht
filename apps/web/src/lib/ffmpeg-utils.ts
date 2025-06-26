import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { TimelineTrack } from '@/stores/timeline-store';
import { MediaItem } from '@/stores/media-store';

let ffmpeg: FFmpeg | null = null;

export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  const baseURL = '/ffmpeg'
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
};

export const generateThumbnail = async (
  videoFile: File,
  timeInSeconds: number = 1
): Promise<string> => {
  const ffmpeg = await initFFmpeg();
  
  const inputName = 'input.mp4';
  const outputName = 'thumbnail.jpg';
  
  // Write input file
  await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));
  
  // Generate thumbnail at specific time
  await ffmpeg.exec([
    '-i', inputName,
    '-ss', timeInSeconds.toString(),
    '-vframes', '1',
    '-vf', 'scale=320:240',
    '-q:v', '2',
    outputName
  ]);
  
  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: 'image/jpeg' });
  
  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  
  return URL.createObjectURL(blob);
};

export const trimVideo = async (
  videoFile: File,
  startTime: number,
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();
  
  const inputName = 'input.mp4';
  const outputName = 'output.mp4';
  
  // Set up progress callback
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }: { progress: number }) => {
      onProgress(progress * 100);
    });
  }
  
  // Write input file
  await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));
  
  const duration = endTime - startTime;
  
  // Trim video
  await ffmpeg.exec([
    '-i', inputName,
    '-ss', startTime.toString(),
    '-t', duration.toString(),
    '-c', 'copy', // Use stream copy for faster processing
    outputName
  ]);
  
  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: 'video/mp4' });
  
  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  
  return blob;
};

export const getVideoInfo = async (videoFile: File): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
}> => {
  const ffmpeg = await initFFmpeg();

  const inputName = 'input.mp4';

  // Write input file
  await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));

  // Capture FFmpeg stderr output with a one-time listener pattern
  let ffmpegOutput = '';
  let listening = true;
  const listener = (data: string) => {
    if (listening) ffmpegOutput += data;
  };
  ffmpeg.on('log', ({ message }: { message: string }) => listener(message));

  // Run ffmpeg to get info (stderr will contain the info)
  try {
    await ffmpeg.exec(['-i', inputName, '-f', 'null', '-']);
  } catch (error) {
    listening = false;
    await ffmpeg.deleteFile(inputName);
    console.error('FFmpeg execution failed:', error);
    throw new Error('Failed to extract video info. The file may be corrupted or in an unsupported format.');
  }

  // Disable listener after exec completes
  listening = false;

  // Cleanup
  await ffmpeg.deleteFile(inputName);

  // Parse output for duration, resolution, and fps
  // Example: Duration: 00:00:10.00, start: 0.000000, bitrate: 1234 kb/s
  // Example: Stream #0:0: Video: h264 (High), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 30 fps, 30 tbr, 90k tbn, 60 tbc

  const durationMatch = ffmpegOutput.match(/Duration: (\d+):(\d+):([\d.]+)/);
  let duration = 0;
  if (durationMatch) {
    const [, h, m, s] = durationMatch;
    duration = parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
  }

  const videoStreamMatch = ffmpegOutput.match(/Video:.* (\d+)x(\d+)[^,]*, ([\d.]+) fps/);
  let width = 0, height = 0, fps = 0;
  if (videoStreamMatch) {
    width = parseInt(videoStreamMatch[1]);
    height = parseInt(videoStreamMatch[2]);
    fps = parseFloat(videoStreamMatch[3]);
  }

  return {
    duration,
    width,
    height,
    fps
  };
};

export const convertToWebM = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();
  
  const inputName = 'input.mp4';
  const outputName = 'output.webm';
  
  // Set up progress callback
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }: { progress: number }) => {
      onProgress(progress * 100);
    });
  }
  
  // Write input file
  await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));
  
  // Convert to WebM
  await ffmpeg.exec([
    '-i', inputName,
    '-c:v', 'libvpx-vp9',
    '-crf', '30',
    '-b:v', '0',
    '-c:a', 'libopus',
    outputName
  ]);
  
  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: 'video/webm' });
  
  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  
  return blob;
};

export const exportTimeline = async (
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }: { progress: number }) => {
      onProgress(progress * 100);
    });
  }

  const inputFiles: string[] = [];
  const filterComplex: string[] = [];
  let videoStreamCount = 0;
  let audioStreamCount = 0;

  // Prepare inputs and map streams
  for (const track of tracks) {
    for (const clip of track.clips) {
      const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
      if (!mediaItem) continue;

      const inputIndex = inputFiles.length;
      const inputName = `input${inputIndex}.dat`;
      await ffmpeg.writeFile(inputName, new Uint8Array(await mediaItem.file.arrayBuffer()));
      inputFiles.push('-i', inputName);

      const clipDuration = clip.duration - clip.trimStart - clip.trimEnd;

      if (mediaItem.type === 'video') {
        filterComplex.push(
          `[${inputIndex}:v]trim=start=${clip.trimStart}:end=${clip.duration - clip.trimEnd},setpts=PTS-STARTPTS,scale=1920:1080,setsar=1[v${videoStreamCount}];`
        );
        filterComplex.push(
          `[v${videoStreamCount}]fifo,adelay=${clip.startTime * 1000}|${clip.startTime * 1000}[v_delayed${videoStreamCount}];`
        );
        videoStreamCount++;
      } else if (mediaItem.type === 'audio') {
        filterComplex.push(
          `[${inputIndex}:a]atrim=start=${clip.trimStart}:end=${clip.duration - clip.trimEnd},asetpts=PTS-STARTPTS[a${audioStreamCount}];`
        );
        filterComplex.push(
          `[a${audioStreamCount}]afifo,adelay=${clip.startTime * 1000}|${clip.startTime * 1000}[a_delayed${audioStreamCount}];`
        );
        audioStreamCount++;
      }
    }
  }

  // Overlay videos
  let lastVideo = `v_delayed0`;
  for (let i = 1; i < videoStreamCount; i++) {
    filterComplex.push(`[${lastVideo}][v_delayed${i}]overlay=shortest=1[v_over${i - 1}];`);
    lastVideo = `v_over${i - 1}`;
  }

  // Mix audios
  let lastAudio = `a_delayed0`;
  if (audioStreamCount > 1) {
    const audioInputs = Array.from({ length: audioStreamCount }, (_, i) => `[a_delayed${i}]`).join('');
    filterComplex.push(`${audioInputs}amix=inputs=${audioStreamCount}[audio_out];`);
    lastAudio = 'audio_out';
  } else if (audioStreamCount === 1) {
    filterComplex.push(`[a_delayed0]acopy[audio_out];`);
    lastAudio = 'audio_out';
  }

  const outputName = 'output.mp4';
  const command = [
    ...inputFiles,
    '-filter_complex',
    filterComplex.join(''),
    '-map', `[${lastVideo}]`,
  ];

  if (audioStreamCount > 0) {
    command.push('-map', `[${lastAudio}]`);
  }
  
  command.push('-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-t', totalDuration.toString(), outputName);

  await ffmpeg.exec(command);

  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: 'video/mp4' });

  // Cleanup
  for (let i = 0; i < inputFiles.length / 2; i++) {
    await ffmpeg.deleteFile(`input${i}.dat`);
  }
  await ffmpeg.deleteFile(outputName);

  return blob;
};

export const extractAudio = async (
  videoFile: File,
  format: 'mp3' | 'wav' = 'mp3'
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();
  
  const inputName = 'input.mp4';
  const outputName = `output.${format}`;
  
  // Write input file
  await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));
  
  // Extract audio
  await ffmpeg.exec([
    '-i',
    inputName,
    '-vn', // Disable video
    '-acodec',
    format === 'mp3' ? 'libmp3lame' : 'pcm_s16le',
    outputName,
  ]);
  
  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: `audio/${format}` });
  
  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  
  return blob;
};
