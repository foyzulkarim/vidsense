import { NextRequest, NextResponse } from 'next/server';
import { Video } from '@/lib/db/models';
import { videoIdSchema } from '@/lib/validation/video';
import type { ApiResponse, VideoStatusResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<VideoStatusResponse>>> {
  try {
    const { id } = await params;

    // Validate video ID
    const validationResult = videoIdSchema.safeParse(id);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const video = await Video.findByPk(id);

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if video has expired
    if (video.expiresAt < new Date() || video.status === 'deleted') {
      return NextResponse.json(
        { error: 'Video has expired or been deleted' },
        { status: 410 }
      );
    }

    // Calculate processing progress based on status
    let processingProgress = 0;
    let processingStage = video.status;

    switch (video.status) {
      case 'uploading':
        processingProgress = 10;
        break;
      case 'converting':
        processingProgress = 25;
        break;
      case 'extracting':
        processingProgress = 50;
        break;
      case 'processing':
        processingProgress = 75;
        break;
      case 'ready':
        processingProgress = 100;
        break;
      case 'error':
        processingProgress = 0;
        break;
    }

    const response: VideoStatusResponse = {
      videoId: video.id,
      status: video.status,
      duration: video.durationSeconds || undefined,
      expiresAt: video.expiresAt.toISOString(),
      processingStage,
      processingProgress,
      error: video.errorMessage || undefined,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error('Error fetching video status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video status' },
      { status: 500 }
    );
  }
}
