import { NextRequest, NextResponse } from 'next/server';
import { Video, VideoAnalysis, Conversation, Message } from '@/lib/db/models';
import { videoIdSchema, chatMessageSchema } from '@/lib/validation/video';
import { getOllamaClient } from '@/lib/ai/ollama';
import { getFollowUpPrompt } from '@/lib/ai/prompts';
import type { ApiResponse, ChatResponse, MessageAttributes } from '@/types';

export const dynamic = 'force-dynamic';

// POST - Send a message and get AI response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ChatResponse>>> {
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

    // Parse and validate request body
    const body = await request.json();
    const messageValidation = chatMessageSchema.safeParse(body);
    if (!messageValidation.success) {
      return NextResponse.json(
        { error: messageValidation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { message: userMessage } = messageValidation.data;

    // Get video and check validity
    const video = await Video.findByPk(id);
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    if (video.expiresAt < new Date() || video.status === 'deleted') {
      return NextResponse.json(
        { error: 'Video has expired or been deleted' },
        { status: 410 }
      );
    }

    // Get video analysis
    const analysis = await VideoAnalysis.findOne({
      where: { videoId: id },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Video analysis not found. Please wait for analysis to complete.' },
        { status: 404 }
      );
    }

    // Get or create conversation
    let conversation = await Conversation.findOne({
      where: { videoId: id },
    });

    if (!conversation) {
      conversation = await Conversation.create({ videoId: id });
    }

    // Get conversation history
    const messages = await Message.findAll({
      where: { conversationId: conversation.id },
      order: [['createdAt', 'ASC']],
      limit: 20, // Limit to last 20 messages for context
    });

    // Format chat history
    const chatHistory = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    // Build analysis context
    const analysisContext = buildAnalysisContext(analysis);

    // Build prompt for follow-up
    const prompt = getFollowUpPrompt(analysisContext, chatHistory, userMessage);

    // Get AI response
    const ollama = getOllamaClient();
    let aiResponse: string;

    try {
      // Check if we have frames to include
      if (video.framePaths && video.framePaths.length > 0) {
        // Use vision model with frames for better context
        const selectedFrames = selectFramesForChat(video.framePaths);
        aiResponse = await ollama.analyzeFrames(selectedFrames, prompt, {
          temperature: 0.5,
          maxTokens: 1024,
        });
      } else {
        // Text-only response
        aiResponse = await ollama.generate(prompt, {
          temperature: 0.5,
          maxTokens: 1024,
        });
      }
    } catch (aiError) {
      console.error('AI response error:', aiError);
      // Fallback to text-only if vision fails
      aiResponse = await ollama.generate(prompt, {
        temperature: 0.5,
        maxTokens: 1024,
      });
    }

    // Save user message
    const userMsg = await Message.create({
      conversationId: conversation.id,
      role: 'user',
      content: userMessage,
    });

    // Save AI response
    const assistantMsg = await Message.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: aiResponse,
    });

    return NextResponse.json({
      data: {
        messageId: assistantMsg.id,
        response: aiResponse,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

// Build analysis context for chat
function buildAnalysisContext(analysis: VideoAnalysis): string {
  const parts: string[] = [];

  if (analysis.comprehensiveSummary) {
    parts.push(`Summary:\n${analysis.comprehensiveSummary}`);
  }

  if (analysis.sceneContextJson) {
    const ctx = analysis.sceneContextJson;
    parts.push(`Scene Context:
- Location: ${ctx.locationType}
- Camera: ${ctx.cameraType}
- Time: ${ctx.timeOfDay}
${ctx.weather ? `- Weather: ${ctx.weather}` : ''}`);
  }

  if (analysis.entitiesJson) {
    const entities = analysis.entitiesJson;
    const entityList: string[] = [];

    if (entities.people?.length) {
      entityList.push(`People: ${entities.people.map((p) => p.description).join('; ')}`);
    }
    if (entities.vehicles?.length) {
      entityList.push(`Vehicles: ${entities.vehicles.map((v) => v.description).join('; ')}`);
    }
    if (entities.animals?.length) {
      entityList.push(`Animals: ${entities.animals.map((a) => a.description).join('; ')}`);
    }
    if (entities.objects?.length) {
      entityList.push(`Objects: ${entities.objects.map((o) => o.description).join('; ')}`);
    }

    if (entityList.length) {
      parts.push(`Entities:\n${entityList.join('\n')}`);
    }
  }

  if (analysis.narrativeJson?.length) {
    const narrative = analysis.narrativeJson
      .map((e) => `[${e.timestamp}] ${e.event}`)
      .join('\n');
    parts.push(`Events:\n${narrative}`);
  }

  if (analysis.keyObservations?.length) {
    parts.push(`Key Observations:\n- ${analysis.keyObservations.join('\n- ')}`);
  }

  return parts.join('\n\n');
}

// Select a subset of frames for chat context
function selectFramesForChat(framePaths: string[], maxFrames: number = 5): string[] {
  if (framePaths.length <= maxFrames) {
    return framePaths;
  }

  // Select evenly distributed frames
  const step = framePaths.length / maxFrames;
  const selected: string[] = [];
  for (let i = 0; i < maxFrames; i++) {
    selected.push(framePaths[Math.floor(i * step)]);
  }
  return selected;
}
