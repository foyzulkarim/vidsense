import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { config } from '@/config';

interface VideoMetadata {
  durationSeconds: number;
  resolution: string;
  hasAudio: boolean;
  width: number;
  height: number;
  fps: number;
}

// Get video metadata using ffprobe
export function getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get video metadata: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      const durationSeconds = metadata.format.duration || 0;
      const width = videoStream.width || 0;
      const height = videoStream.height || 0;

      // Calculate FPS from frame rate string (e.g., "30/1" or "29.97")
      let fps = 30;
      if (videoStream.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split('/');
        if (parts.length === 2) {
          fps = parseInt(parts[0]) / parseInt(parts[1]);
        } else {
          fps = parseFloat(videoStream.r_frame_rate);
        }
      }

      resolve({
        durationSeconds,
        resolution: `${width}x${height}`,
        hasAudio: !!audioStream,
        width,
        height,
        fps,
      });
    });
  });
}

// Convert video to WebM format
export function convertToWebm(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libvpx-vp9',     // VP9 video codec
        '-crf 30',             // Quality (lower = better, 15-35 typical)
        '-b:v 0',              // Variable bitrate
        '-vf scale=-2:720',    // Scale to 720p, maintain aspect ratio
        '-c:a libopus',        // Opus audio codec
        '-b:a 128k',           // Audio bitrate
        '-deadline good',      // Encoding speed (good balance)
        '-cpu-used 2',         // CPU usage (0-5, higher = faster)
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        console.log('FFmpeg conversion started:', cmd);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Conversion progress: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('end', () => {
        console.log('Conversion complete');
        resolve();
      })
      .on('error', (err) => {
        console.error('Conversion error:', err);
        reject(new Error(`Video conversion failed: ${err.message}`));
      })
      .run();
  });
}

// Extract frames from video
export function extractFrames(
  inputPath: string,
  outputDir: string,
  durationSeconds: number
): Promise<number> {
  return new Promise((resolve, reject) => {
    // Calculate target frame count
    const targetFps = config.video.frameExtractionFps;
    const maxFrames = config.video.maxFrames;
    const estimatedFrames = Math.min(
      Math.ceil(durationSeconds * targetFps),
      maxFrames
    );

    // Use scene detection for keyframes combined with uniform sampling
    const outputPattern = path.join(outputDir, 'frame_%04d.jpg');

    // For short videos, use uniform sampling
    // For longer videos, add scene detection
    const filters: string[] = [];

    if (durationSeconds <= 10) {
      // For very short videos, just use fps filter
      filters.push(`fps=${targetFps}`);
    } else {
      // Combine scene detection with fps for better coverage
      // This selects frames at 1fps OR when scene changes significantly
      filters.push(
        `select='gte(n\\,0)*not(mod(n\\,30))+gt(scene\\,${config.video.sceneChangeThreshold})'`
      );
    }

    filters.push(`scale=-2:720`); // Scale down for processing

    let frameCount = 0;

    ffmpeg(inputPath)
      .outputOptions([
        '-vf', filters.join(','),
        '-vsync vfr',              // Variable frame rate (needed for select filter)
        '-q:v 2',                  // JPEG quality (2-31, lower = better)
        `-frames:v ${maxFrames}`,  // Limit max frames
      ])
      .output(outputPattern)
      .on('start', (cmd) => {
        console.log('Frame extraction started:', cmd);
      })
      .on('end', async () => {
        // Count extracted frames
        const fs = await import('fs/promises');
        const files = await fs.readdir(outputDir);
        frameCount = files.filter((f) => f.startsWith('frame_') && f.endsWith('.jpg')).length;
        console.log(`Extracted ${frameCount} frames`);
        resolve(frameCount);
      })
      .on('error', (err) => {
        console.error('Frame extraction error:', err);
        reject(new Error(`Frame extraction failed: ${err.message}`));
      })
      .run();
  });
}

// Extract a single frame at a specific timestamp
export function extractFrameAt(
  inputPath: string,
  outputPath: string,
  timestampSeconds: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(timestampSeconds)
      .outputOptions([
        '-frames:v 1',
        '-q:v 2',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`Frame extraction failed: ${err.message}`)))
      .run();
  });
}

// Get thumbnail from video
export function generateThumbnail(
  inputPath: string,
  outputPath: string,
  timestampSeconds: number = 0
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(timestampSeconds)
      .outputOptions([
        '-frames:v 1',
        '-vf scale=320:-2',
        '-q:v 5',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`Thumbnail generation failed: ${err.message}`)))
      .run();
  });
}
