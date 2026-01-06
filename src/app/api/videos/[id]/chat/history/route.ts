import { NextRequest, NextResponse } from 'next/server';
import { Video, Conversation, Message } from '@/lib/db/models';
import { videoIdSchema } from '@/lib/validation/video';
import type { ApiResponse, MessageAttributes } from '@/types';

export const dynamic = 'force-dynamic';

interface ChatHistoryResponse {
  conversationId: string | null;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
  }>;
}

// GET - Get chat history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ChatHistoryResponse>>> {
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

    // Get conversation
    const conversation = await Conversation.findOne({
      where: { videoId: id },
    });

    if (!conversation) {
      return NextResponse.json({
        data: {
          conversationId: null,
          messages: [],
        },
      });
    }

    // Get messages
    const messages = await Message.findAll({
      where: { conversationId: conversation.id },
      order: [['createdAt', 'ASC']],
    });

    return NextResponse.json({
      data: {
        conversationId: conversation.id,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

// DELETE - Clear chat history
export async function DELETE(
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

    // Get video
    const video = await Video.findByPk(id);
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Get and delete conversation (cascades to messages)
    const conversation = await Conversation.findOne({
      where: { videoId: id },
    });

    if (conversation) {
      await conversation.destroy();
    }

    return NextResponse.json({
      message: 'Chat history cleared',
    });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat history' },
      { status: 500 }
    );
  }
}
