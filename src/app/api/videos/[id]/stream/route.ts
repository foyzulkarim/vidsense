import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { Video } from '@/lib/db/models';
import { videoIdSchema } from '@/lib/validation/video';
import { fileExists } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    // Prefer WebM if available, otherwise use original
    const videoPath = video.webmPath || video.filePath;
    const contentType = video.webmPath ? 'video/webm' : 'video/mp4';

    // Check if file exists
    if (!(await fileExists(videoPath))) {
      return NextResponse.json(
        { error: 'Video file not found' },
        { status: 404 }
      );
    }

    // Get file stats for range support
    const stat = await fs.stat(videoPath);
    const fileSize = stat.size;

    // Check for range header for streaming support
    const range = request.headers.get('range');

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileHandle = await fs.open(videoPath, 'r');
      const buffer = Buffer.alloc(chunkSize);
      await fileHandle.read(buffer, 0, chunkSize, start);
      await fileHandle.close();

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
        },
      });
    }

    // Full file response
    const buffer = await fs.readFile(videoPath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Length': String(fileSize),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('Error streaming video:', error);
    return NextResponse.json(
      { error: 'Failed to stream video' },
      { status: 500 }
    );
  }
}
