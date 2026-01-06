'use client';

import { useRef, useState } from 'react';

interface VideoPlayerProps {
  videoId: string;
  className?: string;
}

export default function VideoPlayer({ videoId, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setError('Failed to load video');
    setIsLoading(false);
  };

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative aspect-video bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-blue-500" />
        </div>
      )}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <p>{error}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls
          playsInline
          preload="metadata"
          onError={handleError}
          onLoadedData={handleLoadedData}
        >
          <source src={`/api/videos/${videoId}/stream`} type="video/webm" />
          <source src={`/api/videos/${videoId}/stream`} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
}
