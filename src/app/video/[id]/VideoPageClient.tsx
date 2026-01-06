'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import VideoPlayer from '@/components/features/VideoPlayer';
import ProcessingStatus from '@/components/features/ProcessingStatus';
import AnalysisPanel from '@/components/features/AnalysisPanel';
import ChatInterface from '@/components/features/ChatInterface';
import type { VideoStatus } from '@/types';

interface VideoPageClientProps {
  videoId: string;
  initialStatus: VideoStatus;
  expiresAt: string;
}

export default function VideoPageClient({
  videoId,
  initialStatus,
  expiresAt,
}: VideoPageClientProps) {
  const [status, setStatus] = useState<VideoStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);

  const handleReady = useCallback(() => {
    setStatus('ready');
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setStatus('error');
  }, []);

  const isProcessing = status !== 'ready' && status !== 'error' && status !== 'deleted';
  const isReady = status === 'ready';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-8 h-8 text-blue-600"
              >
                <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
              </svg>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                VidSense
              </span>
            </Link>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Upload Another Video
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Processing View */}
        {isProcessing && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Processing Your Video
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                This may take a few minutes. You can leave this page open and we&apos;ll let you know when it&apos;s ready.
              </p>
            </div>

            <ProcessingStatus
              videoId={videoId}
              initialStatus={initialStatus}
              onReady={handleReady}
              onError={handleError}
            />

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>
                Video will expire on{' '}
                {new Date(expiresAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Error View */}
        {status === 'error' && (
          <div className="max-w-2xl mx-auto space-y-8 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8">
              <svg
                className="w-12 h-12 mx-auto text-red-500 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
                Processing Failed
              </h2>
              <p className="text-red-600 dark:text-red-400 mb-4">
                {error || 'An error occurred while processing your video.'}
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </Link>
            </div>
          </div>
        )}

        {/* Ready View */}
        {isReady && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Video Player Section */}
              <div className="space-y-4">
                <VideoPlayer videoId={videoId} />
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p>
                    Video expires on{' '}
                    {new Date(expiresAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Analysis Section */}
              <div className="lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
                <AnalysisPanel videoId={videoId} />
              </div>
            </div>

            {/* Chat Section */}
            <div className="max-w-4xl mx-auto">
              <ChatInterface videoId={videoId} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
