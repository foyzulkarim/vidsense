import { Video, VideoAnalysis } from '@/lib/db/models';
import { getOllamaClient } from './ollama';
import { config } from '@/config';
import {
  SINGLE_PASS_ANALYSIS_PROMPT,
  ENTITY_INVENTORY_PROMPT,
  getTemporalNarrativePrompt,
  getDeepAnalysisPrompt,
  getSynthesisPrompt,
} from './prompts';
import type { EntitiesData, NarrativeEvent, SceneContext } from '@/types';

interface AnalysisResult {
  comprehensiveSummary: string;
  entitiesJson: EntitiesData | null;
  narrativeJson: NarrativeEvent[] | null;
  sceneContextJson: SceneContext | null;
  keyObservations: string[];
  rawModelOutputs: Record<string, unknown>;
  processingTimeMs: number;
}

/**
 * Analyze a video using single-pass analysis
 * Suitable for most videos, faster processing
 */
export async function analyzeVideoSinglePass(videoId: string): Promise<AnalysisResult> {
  const startTime = Date.now();

  const video = await Video.findByPk(videoId);
  if (!video) {
    throw new Error(`Video ${videoId} not found`);
  }

  if (!video.framePaths || video.framePaths.length === 0) {
    throw new Error(`Video ${videoId} has no extracted frames`);
  }

  const ollama = getOllamaClient();

  // Check if Ollama is available
  const isAvailable = await ollama.isAvailable();
  if (!isAvailable) {
    throw new Error('Ollama is not available. Please ensure Ollama is running.');
  }

  // Select frames for analysis (use all if under limit, otherwise sample)
  const maxFrames = 20; // Limit for single-pass analysis
  let selectedFrames = video.framePaths;
  if (selectedFrames.length > maxFrames) {
    // Sample frames evenly
    const step = selectedFrames.length / maxFrames;
    selectedFrames = Array.from({ length: maxFrames }, (_, i) =>
      video.framePaths![Math.floor(i * step)]
    );
  }

  console.log(`Analyzing video ${videoId} with ${selectedFrames.length} frames`);

  // Run single-pass analysis
  const analysisResponse = await ollama.analyzeFrames(
    selectedFrames,
    SINGLE_PASS_ANALYSIS_PROMPT,
    {
      temperature: 0.3,
      maxTokens: 4096,
    }
  );

  // Parse the response to extract structured data
  const parsedAnalysis = parseAnalysisResponse(analysisResponse);

  const processingTimeMs = Date.now() - startTime;

  return {
    comprehensiveSummary: parsedAnalysis.summary,
    entitiesJson: parsedAnalysis.entities,
    narrativeJson: parsedAnalysis.narrative,
    sceneContextJson: parsedAnalysis.sceneContext,
    keyObservations: parsedAnalysis.keyObservations,
    rawModelOutputs: {
      singlePass: analysisResponse,
    },
    processingTimeMs,
  };
}

/**
 * Analyze a video using multi-pass analysis
 * More thorough, suitable for complex videos
 */
export async function analyzeVideoMultiPass(videoId: string): Promise<AnalysisResult> {
  const startTime = Date.now();

  const video = await Video.findByPk(videoId);
  if (!video) {
    throw new Error(`Video ${videoId} not found`);
  }

  if (!video.framePaths || video.framePaths.length === 0) {
    throw new Error(`Video ${videoId} has no extracted frames`);
  }

  const ollama = getOllamaClient();

  // Check if Ollama is available
  const isAvailable = await ollama.isAvailable();
  if (!isAvailable) {
    throw new Error('Ollama is not available. Please ensure Ollama is running.');
  }

  console.log(`Starting multi-pass analysis for video ${videoId}`);

  const rawOutputs: Record<string, string> = {};

  // Pass 1: Entity Inventory
  console.log('Pass 1: Entity Inventory');
  const entityResponse = await ollama.analyzeFrames(
    video.framePaths,
    ENTITY_INVENTORY_PROMPT,
    { temperature: 0.3, maxTokens: 3000 }
  );
  rawOutputs.entityInventory = entityResponse;

  // Pass 2: Temporal Narrative
  console.log('Pass 2: Temporal Narrative');
  const narrativeResponse = await ollama.analyzeFrames(
    video.framePaths,
    getTemporalNarrativePrompt(entityResponse),
    { temperature: 0.3, maxTokens: 3000 }
  );
  rawOutputs.temporalNarrative = narrativeResponse;

  // Pass 3: Deep Analysis
  console.log('Pass 3: Deep Analysis');
  const deepAnalysisResponse = await ollama.analyzeFrames(
    video.framePaths.slice(0, 10), // Use fewer frames for context analysis
    getDeepAnalysisPrompt(narrativeResponse),
    { temperature: 0.4, maxTokens: 2000 }
  );
  rawOutputs.deepAnalysis = deepAnalysisResponse;

  // Pass 4: Synthesis
  console.log('Pass 4: Synthesis');
  const synthesisResponse = await ollama.generate(
    getSynthesisPrompt(
      deepAnalysisResponse,
      entityResponse,
      narrativeResponse,
      deepAnalysisResponse
    ),
    { temperature: 0.4, maxTokens: 2000 }
  );
  rawOutputs.synthesis = synthesisResponse;

  // Parse all responses
  const parsedAnalysis = parseMultiPassResponses(
    entityResponse,
    narrativeResponse,
    deepAnalysisResponse,
    synthesisResponse
  );

  const processingTimeMs = Date.now() - startTime;

  return {
    comprehensiveSummary: parsedAnalysis.summary,
    entitiesJson: parsedAnalysis.entities,
    narrativeJson: parsedAnalysis.narrative,
    sceneContextJson: parsedAnalysis.sceneContext,
    keyObservations: parsedAnalysis.keyObservations,
    rawModelOutputs: rawOutputs,
    processingTimeMs,
  };
}

/**
 * Parse single-pass analysis response
 */
function parseAnalysisResponse(response: string): {
  summary: string;
  entities: EntitiesData;
  narrative: NarrativeEvent[];
  sceneContext: SceneContext;
  keyObservations: string[];
} {
  // Default structured data
  const entities: EntitiesData = {
    people: [],
    vehicles: [],
    animals: [],
    objects: [],
  };

  const narrative: NarrativeEvent[] = [];
  const keyObservations: string[] = [];

  // Extract scene context
  const sceneContext: SceneContext = {
    locationType: extractSection(response, 'Location type', 'Unknown'),
    cameraType: extractSection(response, 'Camera', 'Unknown'),
    timeOfDay: extractSection(response, 'Time of day', 'Unknown'),
    weather: extractSection(response, 'Weather', undefined),
    lightingConditions: extractSection(response, 'Lighting', undefined),
  };

  // Extract key observations section
  const keyObsMatch = response.match(/Key Observations[:\s]*([\s\S]*?)(?:Summary|$)/i);
  if (keyObsMatch) {
    const observations = keyObsMatch[1]
      .split(/\n/)
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter((line) => line.length > 0);
    keyObservations.push(...observations);
  }

  // Extract summary
  const summaryMatch = response.match(/Summary[:\s]*([\s\S]*?)(?:$)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : response;

  // Extract narrative events from "What Happened" section
  const whatHappenedMatch = response.match(/What Happened[:\s]*([\s\S]*?)(?:Key Observations|Summary|$)/i);
  if (whatHappenedMatch) {
    const events = whatHappenedMatch[1]
      .split(/\n/)
      .filter((line) => line.trim().length > 0)
      .map((line, index) => ({
        timestamp: `Event ${index + 1}`,
        event: line.replace(/^[-•*]\s*/, '').trim(),
      }));
    narrative.push(...events);
  }

  // Extract entities from response
  const peopleMatch = response.match(/People[:\s]*([\s\S]*?)(?:Vehicles|Animals|Objects|What Happened|$)/i);
  if (peopleMatch) {
    const peopleText = peopleMatch[1];
    const personMatches = peopleText.match(/(?:person|individual|man|woman|child|adult)[^.]*\./gi);
    if (personMatches) {
      personMatches.forEach((match, index) => {
        entities.people.push({
          id: `person_${index + 1}`,
          description: match.trim(),
        });
      });
    }
  }

  return {
    summary: summary.substring(0, 2000), // Limit summary length
    entities,
    narrative,
    sceneContext,
    keyObservations,
  };
}

/**
 * Parse multi-pass analysis responses
 */
function parseMultiPassResponses(
  entityResponse: string,
  narrativeResponse: string,
  deepAnalysisResponse: string,
  synthesisResponse: string
): {
  summary: string;
  entities: EntitiesData;
  narrative: NarrativeEvent[];
  sceneContext: SceneContext;
  keyObservations: string[];
} {
  // Parse entity response
  const entities: EntitiesData = {
    people: [],
    vehicles: [],
    animals: [],
    objects: [],
  };

  // Extract people
  const peopleSection = entityResponse.match(/PEOPLE[:\s]*([\s\S]*?)(?:VEHICLES|ANIMALS|OBJECTS|$)/i);
  if (peopleSection) {
    const lines = peopleSection[1].split(/\n/).filter((l) => l.trim());
    let currentPerson: { id: string; description: string; [key: string]: string } | null = null;

    lines.forEach((line) => {
      const idMatch = line.match(/ID[:\s]*(person_\d+)/i);
      if (idMatch) {
        if (currentPerson) entities.people.push(currentPerson);
        currentPerson = { id: idMatch[1], description: '' };
      } else if (currentPerson) {
        const fieldMatch = line.match(/^-?\s*(\w+)[:\s]+(.+)/);
        if (fieldMatch) {
          const key = fieldMatch[1].toLowerCase();
          currentPerson[key] = fieldMatch[2].trim();
          if (!currentPerson.description && key === 'description') {
            currentPerson.description = fieldMatch[2].trim();
          }
        }
      }
    });
    if (currentPerson) entities.people.push(currentPerson);
  }

  // Parse narrative
  const narrative: NarrativeEvent[] = [];
  const narrativeLines = narrativeResponse.split(/\n/).filter((l) => l.trim());
  narrativeLines.forEach((line) => {
    const match = line.match(/\[([^\]]+)\]\s*(.*)/);
    if (match) {
      narrative.push({
        timestamp: match[1],
        event: match[2],
      });
    } else if (line.match(/^\d+:/)) {
      // Handle "0:05 Event description" format
      const [timestamp, ...eventParts] = line.split(/\s+/);
      narrative.push({
        timestamp,
        event: eventParts.join(' '),
      });
    }
  });

  // Parse scene context from deep analysis
  const sceneContext: SceneContext = {
    locationType: extractSection(deepAnalysisResponse, 'Location type', 'Unknown'),
    cameraType: extractSection(deepAnalysisResponse, 'Camera type', 'Unknown'),
    timeOfDay: extractSection(deepAnalysisResponse, 'Time of day', 'Unknown'),
    weather: extractSection(deepAnalysisResponse, 'Weather', undefined),
    lightingConditions: extractSection(deepAnalysisResponse, 'Lighting', undefined),
  };

  // Extract key observations
  const keyObservations: string[] = [];
  const keyObsMatch = synthesisResponse.match(/Key Observations[:\s]*([\s\S]*?)(?:concerns|attention|$)/i);
  if (keyObsMatch) {
    const observations = keyObsMatch[1]
      .split(/\n/)
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter((line) => line.length > 5);
    keyObservations.push(...observations.slice(0, 5));
  }

  // Get summary
  const summaryMatch = synthesisResponse.match(/^([\s\S]*?)(?:Key Observations|$)/);
  const summary = summaryMatch ? summaryMatch[1].trim() : synthesisResponse;

  return {
    summary: summary.substring(0, 3000),
    entities,
    narrative,
    sceneContext,
    keyObservations,
  };
}

/**
 * Extract a section value from text
 */
function extractSection(text: string, key: string, defaultValue: string | undefined): string {
  const regex = new RegExp(`${key}[:\\s]*([^\\n]+)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : (defaultValue || 'Unknown');
}

/**
 * Run analysis and store results
 */
export async function processVideoAnalysis(videoId: string, multiPass: boolean = false): Promise<void> {
  const video = await Video.findByPk(videoId);

  if (!video) {
    throw new Error(`Video ${videoId} not found`);
  }

  try {
    // Update status to processing
    await video.update({ status: 'processing' });

    // Run analysis
    const result = multiPass
      ? await analyzeVideoMultiPass(videoId)
      : await analyzeVideoSinglePass(videoId);

    // Store results
    await VideoAnalysis.create({
      videoId,
      frameCount: video.frameCount || 0,
      entitiesJson: result.entitiesJson,
      narrativeJson: result.narrativeJson,
      sceneContextJson: result.sceneContextJson,
      comprehensiveSummary: result.comprehensiveSummary,
      keyObservations: result.keyObservations,
      rawModelOutputs: result.rawModelOutputs,
      processingTimeMs: result.processingTimeMs,
      modelVersion: config.ai.ollamaModel,
    });

    // Update video status
    await video.update({ status: 'ready' });

    console.log(`Analysis complete for video ${videoId} in ${result.processingTimeMs}ms`);
  } catch (error) {
    console.error(`Analysis failed for video ${videoId}:`, error);
    await video.update({
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Analysis failed',
    });
    throw error;
  }
}
