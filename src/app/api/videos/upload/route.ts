import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Video } from '@/lib/db/models';
import { config } from '@/config';
import {
  ensureDir,
  getUploadDir,
  getFileExtension,
  isValidVideoExtension,
} from '@/lib/storage';
import { validateFileMagicBytes } from '@/lib/validation/video';
import type { ApiResponse, UploadResponse } from '@/types';

export const dynamic = 'force-dynamic';

// Disable body parser for file uploads (Next.js 14 handles this automatically)
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<UploadResponse>>> {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Validate file extension
    const extension = getFileExtension(file.name);
    if (!isValidVideoExtension(extension)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed: ${config.video.allowedExtensions.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > config.storage.maxFileSizeBytes) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${config.storage.maxFileSizeMB}MB`,
        },
        { status: 400 }
      );
    }

    // Read file buffer for magic byte validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes
    const magicBytesValidation = validateFileMagicBytes(buffer);
    if (!magicBytesValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a valid video file.' },
        { status: 400 }
      );
    }

    // Generate video ID and create directories
    const videoId = uuidv4();
    const uploadDir = getUploadDir(videoId);
    await ensureDir(uploadDir);

    // Save original file
    const originalFilename = `original${extension}`;
    const filePath = path.join(uploadDir, originalFilename);
    await fs.writeFile(filePath, buffer);

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.storage.videoRetentionHours);

    // Create database record
    const video = await Video.create({
      id: videoId,
      originalFilename: file.name,
      filePath: filePath,
      fileSizeBytes: file.size,
      status: 'uploading',
      expiresAt: expiresAt,
      hasAudio: false,
    });

    // Update status to converting (processing will happen async)
    await video.update({ status: 'converting' });

    // Start async processing (in production, this would be a job queue)
    // For now, we'll trigger it but not wait for it
    processVideoAsync(videoId).catch((err) => {
      console.error(`Failed to process video ${videoId}:`, err);
    });

    return NextResponse.json({
      data: {
        videoId: video.id,
        status: video.status,
      },
      message: 'Video uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video. Please try again.' },
      { status: 500 }
    );
  }
}

// Async video processing function
async function processVideoAsync(videoId: string): Promise<void> {
  // Import video processing utilities dynamically to avoid circular deps
  const { processVideo } = await import('@/lib/video/processor');
  await processVideo(videoId);
}
