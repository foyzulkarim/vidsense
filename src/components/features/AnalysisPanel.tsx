'use client';

import { useState, useEffect } from 'react';
import type { AnalysisResponse } from '@/types';

interface AnalysisPanelProps {
  videoId: string;
  onAnalysisLoaded?: (analysis: AnalysisResponse) => void;
}

export default function AnalysisPanel({ videoId, onAnalysisLoaded }: AnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'keyObservations'])
  );

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const response = await fetch(`/api/videos/${videoId}/analysis`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 202) {
            // Still processing, will retry
            setError('Analysis in progress...');
            return;
          }
          throw new Error(data.error || 'Failed to fetch analysis');
        }

        setAnalysis(data.data);
        onAnalysisLoaded?.(data.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();

    // Poll if still processing
    const interval = setInterval(async () => {
      if (!analysis && !error?.includes('Failed')) {
        fetchAnalysis();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [videoId, analysis, error, onAnalysisLoaded]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">Loading analysis...</span>
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-amber-600 dark:text-amber-400">
          <p>{error}</p>
          {error.includes('progress') && (
            <p className="mt-2 text-sm text-gray-500">
              The AI is analyzing your video. This may take a few minutes.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-600 dark:text-gray-400">No analysis available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Video Analysis
        </h2>
        {analysis.processingTimeMs && (
          <p className="text-sm text-gray-500 mt-1">
            Analyzed in {(analysis.processingTimeMs / 1000).toFixed(1)}s
          </p>
        )}
      </div>

      {/* Summary Section */}
      <CollapsibleSection
        title="Summary"
        isExpanded={expandedSections.has('summary')}
        onToggle={() => toggleSection('summary')}
      >
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {analysis.summary || 'No summary available'}
        </p>
      </CollapsibleSection>

      {/* Scene Context Section */}
      {analysis.sceneContext && (
        <CollapsibleSection
          title="Scene Context"
          isExpanded={expandedSections.has('sceneContext')}
          onToggle={() => toggleSection('sceneContext')}
        >
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Location" value={analysis.sceneContext.locationType} />
            <InfoItem label="Camera Type" value={analysis.sceneContext.cameraType} />
            <InfoItem label="Time of Day" value={analysis.sceneContext.timeOfDay} />
            {analysis.sceneContext.weather && (
              <InfoItem label="Weather" value={analysis.sceneContext.weather} />
            )}
            {analysis.sceneContext.lightingConditions && (
              <InfoItem label="Lighting" value={analysis.sceneContext.lightingConditions} />
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Entities Section */}
      {analysis.entities && (
        <CollapsibleSection
          title="Entities Detected"
          isExpanded={expandedSections.has('entities')}
          onToggle={() => toggleSection('entities')}
        >
          <div className="space-y-4">
            {analysis.entities.people.length > 0 && (
              <EntityGroup title="People" entities={analysis.entities.people} icon="👤" />
            )}
            {analysis.entities.vehicles.length > 0 && (
              <EntityGroup title="Vehicles" entities={analysis.entities.vehicles} icon="🚗" />
            )}
            {analysis.entities.animals.length > 0 && (
              <EntityGroup title="Animals" entities={analysis.entities.animals} icon="🐾" />
            )}
            {analysis.entities.objects.length > 0 && (
              <EntityGroup title="Objects" entities={analysis.entities.objects} icon="📦" />
            )}
            {Object.values(analysis.entities).every((arr) => arr.length === 0) && (
              <p className="text-gray-500 dark:text-gray-400">No entities detected</p>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Narrative Section */}
      {analysis.narrative && analysis.narrative.length > 0 && (
        <CollapsibleSection
          title="What Happened"
          isExpanded={expandedSections.has('narrative')}
          onToggle={() => toggleSection('narrative')}
        >
          <div className="space-y-3">
            {analysis.narrative.map((event, index) => (
              <div key={index} className="flex gap-3">
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap mt-0.5">
                  {event.timestamp}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{event.event}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Key Observations Section */}
      {analysis.keyObservations && analysis.keyObservations.length > 0 && (
        <CollapsibleSection
          title="Key Observations"
          isExpanded={expandedSections.has('keyObservations')}
          onToggle={() => toggleSection('keyObservations')}
        >
          <ul className="space-y-2">
            {analysis.keyObservations.map((observation, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span className="text-gray-700 dark:text-gray-300">{observation}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  children,
  isExpanded,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// Info Item Component
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
  );
}

// Entity Group Component
function EntityGroup({
  title,
  entities,
  icon,
}: {
  title: string;
  entities: Array<{ id: string; description: string; [key: string]: string | undefined }>;
  icon: string;
}) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <span>{icon}</span>
        {title} ({entities.length})
      </h4>
      <div className="space-y-2">
        {entities.map((entity) => (
          <div
            key={entity.id}
            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm"
          >
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {entity.id}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {entity.description}
            </p>
            {entity.clothing && (
              <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                Clothing: {entity.clothing}
              </p>
            )}
            {entity.role && (
              <p className="text-gray-500 dark:text-gray-500 text-xs">
                Role: {entity.role}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
