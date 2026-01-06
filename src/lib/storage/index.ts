import { promises as fs } from 'fs';
import path from 'path';
import { config } from '@/config';

// Ensure directory exists
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

// Get upload directory for a video
export function getUploadDir(videoId: string): string {
  return path.join(process.cwd(), config.storage.uploadDir, videoId);
}

// Get processed directory for a video
export function getProcessedDir(videoId: string): string {
  return path.join(process.cwd(), config.storage.processedDir, videoId);
}

// Get frames directory for a video
export function getFramesDir(videoId: string): string {
  return path.join(getProcessedDir(videoId), 'frames');
}

// Get original video path
export function getOriginalVideoPath(videoId: string, extension: string): string {
  return path.join(getUploadDir(videoId), `original${extension}`);
}

// Get converted video path
export function getWebmVideoPath(videoId: string): string {
  return path.join(getProcessedDir(videoId), 'video.webm');
}

// Get frame path
export function getFramePath(videoId: string, frameNumber: number): string {
  return path.join(getFramesDir(videoId), `frame_${frameNumber.toString().padStart(4, '0')}.jpg`);
}

// Delete video files
export async function deleteVideoFiles(videoId: string): Promise<void> {
  const uploadDir = getUploadDir(videoId);
  const processedDir = getProcessedDir(videoId);

  try {
    await fs.rm(uploadDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to delete upload dir for ${videoId}:`, error);
  }

  try {
    await fs.rm(processedDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to delete processed dir for ${videoId}:`, error);
  }
}

// Check if file exists
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Read file as buffer
export async function readFile(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}

// Read file as base64
export async function readFileAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
}

// Get file extension from filename
export function getFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext;
}

// Validate file extension
export function isValidVideoExtension(extension: string): boolean {
  return config.video.allowedExtensions.includes(extension.toLowerCase());
}

// Get storage stats
export async function getStorageStats(): Promise<{
  uploadDirExists: boolean;
  processedDirExists: boolean;
}> {
  const uploadDir = path.join(process.cwd(), config.storage.uploadDir);
  const processedDir = path.join(process.cwd(), config.storage.processedDir);

  return {
    uploadDirExists: await fileExists(uploadDir),
    processedDirExists: await fileExists(processedDir),
  };
}
