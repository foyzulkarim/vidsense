import { NextRequest, NextResponse } from 'next/server';
import { Video, VideoAnalysis } from '@/lib/db/models';
import { videoIdSchema } from '@/lib/validation/video';
import type { ApiResponse, AnalysisResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<AnalysisResponse>>> {
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

    // Check if video is ready
    if (video.status !== 'ready') {
      return NextResponse.json(
        {
          error: 'Video is still processing',
          message: `Current status: ${video.status}`,
        },
        { status: 202 }
      );
    }

    // Get analysis
    const analysis = await VideoAnalysis.findOne({
      where: { videoId: id },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    const response: AnalysisResponse = {
      videoId: video.id,
      summary: analysis.comprehensiveSummary,
      entities: analysis.entitiesJson,
      narrative: analysis.narrativeJson,
      transcript: analysis.transcript,
      sceneContext: analysis.sceneContextJson,
      keyObservations: analysis.keyObservations,
      processingTimeMs: analysis.processingTimeMs,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}

// POST to trigger analysis
export async function POST(
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

    // Check if analysis already exists
    const existingAnalysis = await VideoAnalysis.findOne({
      where: { videoId: id },
    });

    if (existingAnalysis) {
      return NextResponse.json(
        { error: 'Analysis already exists', data: { analysisId: existingAnalysis.id } },
        { status: 409 }
      );
    }

    // Check if video has frames
    if (!video.framePaths || video.framePaths.length === 0) {
      return NextResponse.json(
        { error: 'Video has no extracted frames. Wait for processing to complete.' },
        { status: 400 }
      );
    }

    // Check for multiPass parameter
    const body = await request.json().catch(() => ({}));
    const multiPass = body.multiPass === true;

    // Trigger analysis asynchronously
    triggerAnalysis(id, multiPass).catch((err) => {
      console.error(`Analysis failed for ${id}:`, err);
    });

    return NextResponse.json({
      message: 'Analysis started',
      data: { videoId: id, multiPass },
    });
  } catch (error) {
    console.error('Error triggering analysis:', error);
    return NextResponse.json(
      { error: 'Failed to trigger analysis' },
      { status: 500 }
    );
  }
}

async function triggerAnalysis(videoId: string, multiPass: boolean): Promise<void> {
  const { processVideoAnalysis } = await import('@/lib/ai/analyzer');
  await processVideoAnalysis(videoId, multiPass);
}
