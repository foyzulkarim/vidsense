'use client';

import { useEffect, useState, useCallback } from 'react';
import { config } from '@/config';
import type { VideoStatus, VideoStatusResponse } from '@/types';

interface ProcessingStatusProps {
  videoId: string;
  initialStatus?: VideoStatus;
  onReady?: () => void;
  onError?: (error: string) => void;
}

const STATUS_LABELS: Record<VideoStatus, string> = {
  uploading: 'Uploading...',
  converting: 'Converting video...',
  extracting: 'Extracting key frames...',
  processing: 'Analyzing content...',
  ready: 'Ready!',
  error: 'Error',
  deleted: 'Deleted',
};

const STATUS_ICONS: Record<VideoStatus, React.ReactNode> = {
  uploading: (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  converting: (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  extracting: (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  processing: (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  ready: (
    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  deleted: (
    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
};

export default function ProcessingStatus({
  videoId,
  initialStatus = 'uploading',
  onReady,
  onError,
}: ProcessingStatusProps) {
  const [status, setStatus] = useState<VideoStatus>(initialStatus);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      const statusData: VideoStatusResponse = data.data;
      setStatus(statusData.status);
      setProgress(statusData.processingProgress || 0);

      if (statusData.status === 'ready') {
        onReady?.();
      } else if (statusData.status === 'error') {
        setError(statusData.error || 'Processing failed');
        onError?.(statusData.error || 'Processing failed');
      }

      return statusData.status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(errorMessage);
      return 'error' as VideoStatus;
    }
  }, [videoId, onReady, onError]);

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Set up polling
    const interval = setInterval(async () => {
      const currentStatus = await fetchStatus();
      if (currentStatus === 'ready' || currentStatus === 'error' || currentStatus === 'deleted') {
        clearInterval(interval);
      }
    }, config.processing.pollIntervalMs);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        {/* Status Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-blue-600 dark:text-blue-400">
            {STATUS_ICONS[status]}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {STATUS_LABELS[status]}
            </h3>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {status !== 'ready' && status !== 'error' && status !== 'deleted' && (
          <div className="space-y-2">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
              {progress}% complete
            </p>
          </div>
        )}

        {/* Stage Indicators */}
        <div className="mt-6 space-y-3">
          {(['uploading', 'converting', 'extracting', 'processing', 'ready'] as VideoStatus[]).map(
            (stage, index) => {
              const stages: VideoStatus[] = ['uploading', 'converting', 'extracting', 'processing', 'ready'];
              const currentIndex = stages.indexOf(status);
              const stageIndex = stages.indexOf(stage);

              let stageStatus: 'complete' | 'current' | 'pending' = 'pending';
              if (stageIndex < currentIndex || status === 'ready') {
                stageStatus = 'complete';
              } else if (stageIndex === currentIndex) {
                stageStatus = 'current';
              }

              return (
                <div key={stage} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                      ${stageStatus === 'complete' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : ''}
                      ${stageStatus === 'current' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : ''}
                      ${stageStatus === 'pending' ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500' : ''}
                    `}
                  >
                    {stageStatus === 'complete' ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`text-sm
                      ${stageStatus === 'complete' ? 'text-green-600 dark:text-green-400' : ''}
                      ${stageStatus === 'current' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}
                      ${stageStatus === 'pending' ? 'text-gray-400 dark:text-gray-500' : ''}
                    `}
                  >
                    {STATUS_LABELS[stage]}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
