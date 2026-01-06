import { notFound } from 'next/navigation';
import { Video } from '@/lib/db/models';
import VideoPageClient from './VideoPageClient';

interface VideoPageProps {
  params: Promise<{ id: string }>;
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  // Fetch video from database
  const video = await Video.findByPk(id);

  if (!video) {
    notFound();
  }

  // Check if video has expired
  if (video.expiresAt < new Date() || video.status === 'deleted') {
    notFound();
  }

  return (
    <VideoPageClient
      videoId={video.id}
      initialStatus={video.status}
      expiresAt={video.expiresAt.toISOString()}
    />
  );
}

export async function generateMetadata({ params }: VideoPageProps) {
  const { id } = await params;
  return {
    title: `Video Analysis - VidSense`,
    description: `AI-powered analysis of video ${id}`,
  };
}
