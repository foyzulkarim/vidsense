// Application configuration constants
export const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://vidsense:localdev@localhost:5432/vidsense',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'vidsense',
    user: process.env.DB_USER || 'vidsense',
    password: process.env.DB_PASSWORD || 'localdev',
  },

  // Storage
  storage: {
    uploadDir: process.env.UPLOAD_DIR || './data/uploads',
    processedDir: process.env.PROCESSED_DIR || './data/processed',
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10),
    maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10) * 1024 * 1024,
    videoRetentionHours: parseInt(process.env.VIDEO_RETENTION_HOURS || '24', 10),
  },

  // AI / Ollama
  ai: {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'qwen2-vl:7b',
  },

  // Application
  app: {
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },

  // Video constraints
  video: {
    maxDurationSeconds: 60,
    allowedMimeTypes: [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm',
      'video/x-m4v',
    ],
    allowedExtensions: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'],
    frameExtractionFps: 1,
    maxFrames: 60,
    sceneChangeThreshold: 0.3,
    jpegQuality: 85,
  },

  // Processing
  processing: {
    pollIntervalMs: 2000,
    cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

export type Config = typeof config;
