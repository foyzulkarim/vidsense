// Video status types
export type VideoStatus =
  | 'uploading'
  | 'converting'
  | 'extracting'
  | 'processing'
  | 'ready'
  | 'error'
  | 'deleted';

// Message role types
export type MessageRole = 'user' | 'assistant';

// Video model attributes
export interface VideoAttributes {
  id: string;
  originalFilename: string;
  filePath: string;
  webmPath: string | null;
  durationSeconds: number | null;
  resolution: string | null;
  hasAudio: boolean;
  fileSizeBytes: number | null;
  status: VideoStatus;
  errorMessage: string | null;
  frameCount: number | null;
  framePaths: string[] | null;
  createdAt: Date;
  expiresAt: Date;
  deletedAt: Date | null;
}

export interface VideoCreationAttributes extends Omit<VideoAttributes, 'id' | 'createdAt' | 'deletedAt'> {}

// Video analysis attributes
export interface VideoAnalysisAttributes {
  id: string;
  videoId: string;
  frameCount: number;
  entitiesJson: EntitiesData | null;
  narrativeJson: NarrativeEvent[] | null;
  sceneContextJson: SceneContext | null;
  transcript: string | null;
  comprehensiveSummary: string | null;
  keyObservations: string[] | null;
  rawModelOutputs: Record<string, unknown> | null;
  processingTimeMs: number | null;
  modelVersion: string | null;
  createdAt: Date;
}

export interface VideoAnalysisCreationAttributes extends Omit<VideoAnalysisAttributes, 'id' | 'createdAt'> {}

// Conversation attributes
export interface ConversationAttributes {
  id: string;
  videoId: string;
  createdAt: Date;
}

export interface ConversationCreationAttributes extends Omit<ConversationAttributes, 'id' | 'createdAt'> {}

// Message attributes
export interface MessageAttributes {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

export interface MessageCreationAttributes extends Omit<MessageAttributes, 'id' | 'createdAt'> {}

// Analysis data structures
export interface EntityDescription {
  id: string;
  type?: string;
  description: string;
  clothing?: string;
  accessories?: string;
  role?: string;
  firstAppearance?: string;
  lastAppearance?: string;
  visibility?: string;
  position?: string;
  species?: string;
  location?: string;
  behavior?: string;
  finalLocation?: string;
}

export interface EntitiesData {
  people: EntityDescription[];
  vehicles: EntityDescription[];
  animals: EntityDescription[];
  objects: EntityDescription[];
}

export interface NarrativeEvent {
  timestamp: string;
  event: string;
}

export interface SceneContext {
  locationType: string;
  cameraType: string;
  timeOfDay: string;
  weather?: string;
  lightingConditions?: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  videoId: string;
  status: VideoStatus;
}

export interface VideoStatusResponse {
  videoId: string;
  status: VideoStatus;
  duration?: number;
  expiresAt: string;
  processingStage?: string;
  processingProgress?: number;
  error?: string;
}

export interface AnalysisResponse {
  videoId: string;
  summary: string | null;
  entities: EntitiesData | null;
  narrative: NarrativeEvent[] | null;
  transcript: string | null;
  sceneContext: SceneContext | null;
  keyObservations: string[] | null;
  processingTimeMs: number | null;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  messageId: string;
  response: string;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  database: 'connected' | 'disconnected';
  timestamp: string;
  version: string;
}

// Browser local storage types
export interface LocalSession {
  videoId: string;
  uploadedAt: string;
  status: VideoStatus;
}

export interface LocalStorageSchema {
  vidsense_sessions: {
    [videoId: string]: LocalSession;
  };
}
