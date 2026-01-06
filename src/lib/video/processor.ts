import { promises as fs } from 'fs';
import path from 'path';
import { Video } from '@/lib/db/models';
import { config } from '@/config';
import {
  ensureDir,
  getProcessedDir,
  getFramesDir,
  getWebmVideoPath,
  getFramePath,
} from '@/lib/storage';
import { convertToWebm, extractFrames, getVideoMetadata } from './ffmpeg';
import { validateDuration } from '@/lib/validation/video';

export async function processVideo(videoId: string): Promise<void> {
  const video = await Video.findByPk(videoId);

  if (!video) {
    throw new Error(`Video ${videoId} not found`);
  }

  try {
    // Ensure processed directories exist
    const processedDir = getProcessedDir(videoId);
    const framesDir = getFramesDir(videoId);
    await ensureDir(processedDir);
    await ensureDir(framesDir);

    // Update status to converting
    await video.update({ status: 'converting' });

    // Get video metadata
    const metadata = await getVideoMetadata(video.filePath);

    // Validate duration
    const durationValidation = validateDuration(metadata.durationSeconds);
    if (!durationValidation.valid) {
      await video.update({
        status: 'error',
        errorMessage: durationValidation.error,
      });
      return;
    }

    // Update video with metadata
    await video.update({
      durationSeconds: metadata.durationSeconds,
      resolution: metadata.resolution,
      hasAudio: metadata.hasAudio,
    });

    // Convert to WebM
    const webmPath = getWebmVideoPath(videoId);
    await convertToWebm(video.filePath, webmPath);
    await video.update({ webmPath });

    // Update status to extracting
    await video.update({ status: 'extracting' });

    // Extract frames
    const frameCount = await extractFrames(
      webmPath,
      framesDir,
      metadata.durationSeconds
    );

    // Get frame paths
    const framePaths: string[] = [];
    for (let i = 1; i <= frameCount; i++) {
      framePaths.push(getFramePath(videoId, i));
    }

    // Update video with frame info
    await video.update({
      frameCount,
      framePaths,
      status: 'processing', // Ready for AI analysis
    });

    // Trigger AI analysis
    console.log(`Starting AI analysis for video ${videoId}`);
    try {
      const { processVideoAnalysis } = await import('@/lib/ai/analyzer');
      await processVideoAnalysis(videoId, false); // Use single-pass by default
    } catch (analysisError) {
      console.error(`AI analysis failed for ${videoId}, but video processing succeeded:`, analysisError);
      // Mark as ready even if AI analysis fails - user can still view the video
      await video.update({ status: 'ready' });
    }

    console.log(`Video ${videoId} processed successfully`);
  } catch (error) {
    console.error(`Error processing video ${videoId}:`, error);
    await video.update({
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Processing failed',
    });
  }
}

// Function to reprocess a video that failed
export async function reprocessVideo(videoId: string): Promise<void> {
  const video = await Video.findByPk(videoId);

  if (!video) {
    throw new Error(`Video ${videoId} not found`);
  }

  if (video.status !== 'error') {
    throw new Error(`Video ${videoId} is not in error state`);
  }

  await video.update({ status: 'converting', errorMessage: null });
  await processVideo(videoId);
}
