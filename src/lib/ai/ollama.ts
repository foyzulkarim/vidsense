import { config } from '@/config';

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  images?: string[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
    stop?: string[];
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

interface OllamaTagsResponse {
  models: OllamaModelInfo[];
}

export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;

  constructor(baseUrl?: string, defaultModel?: string) {
    this.baseUrl = baseUrl || config.ai.ollamaBaseUrl;
    this.defaultModel = defaultModel || config.ai.ollamaModel;
  }

  /**
   * Check if Ollama is available and the model is loaded
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async getModels(): Promise<OllamaModelInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to get models: ${response.statusText}`);
    }

    const data: OllamaTagsResponse = await response.json();
    return data.models;
  }

  /**
   * Check if a specific model is available
   */
  async hasModel(modelName: string): Promise<boolean> {
    try {
      const models = await this.getModels();
      return models.some((m) => m.name === modelName || m.name.startsWith(`${modelName}:`));
    } catch {
      return false;
    }
  }

  /**
   * Generate a response with text prompt (no images)
   */
  async generate(prompt: string, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const request: OllamaGenerateRequest = {
      model: options?.model || this.defaultModel,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
        num_predict: options?.maxTokens ?? 2048,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama generate failed: ${response.statusText} - ${errorText}`);
    }

    const data: OllamaGenerateResponse = await response.json();
    return data.response;
  }

  /**
   * Analyze images with a vision model
   */
  async analyzeImages(
    images: string[],
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const request: OllamaGenerateRequest = {
      model: options?.model || this.defaultModel,
      prompt,
      images, // Base64 encoded images
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.3, // Lower temperature for more deterministic analysis
        num_predict: options?.maxTokens ?? 4096,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama vision analysis failed: ${response.statusText} - ${errorText}`);
    }

    const data: OllamaGenerateResponse = await response.json();
    return data.response;
  }

  /**
   * Analyze video frames with context
   * Processes frames in batches if needed
   */
  async analyzeFrames(
    framePaths: string[],
    prompt: string,
    options?: {
      model?: string;
      batchSize?: number;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const { readFileAsBase64 } = await import('@/lib/storage');

    const batchSize = options?.batchSize ?? 10; // Process 10 frames at a time
    const results: string[] = [];

    // Process frames in batches
    for (let i = 0; i < framePaths.length; i += batchSize) {
      const batch = framePaths.slice(i, i + batchSize);

      // Convert batch to base64
      const base64Images = await Promise.all(
        batch.map(async (framePath) => {
          try {
            return await readFileAsBase64(framePath);
          } catch (error) {
            console.error(`Failed to read frame ${framePath}:`, error);
            return null;
          }
        })
      );

      // Filter out failed reads
      const validImages = base64Images.filter((img): img is string => img !== null);

      if (validImages.length === 0) {
        continue;
      }

      // Analyze batch
      const batchPrompt = `${prompt}\n\n[Analyzing frames ${i + 1}-${i + validImages.length} of ${framePaths.length}]`;
      const batchResult = await this.analyzeImages(validImages, batchPrompt, options);
      results.push(batchResult);
    }

    // If single batch, return directly
    if (results.length === 1) {
      return results[0];
    }

    // Combine batch results if multiple
    if (results.length > 1) {
      const combinedPrompt = `You have analyzed a video in multiple batches. Here are the partial analyses:

${results.map((r, i) => `[Batch ${i + 1}]:\n${r}`).join('\n\n')}

Please synthesize these partial analyses into a single coherent understanding of the entire video.`;

      return this.generate(combinedPrompt, {
        model: options?.model,
        temperature: 0.3,
        maxTokens: 4096,
      });
    }

    return 'No frames could be analyzed.';
  }
}

// Singleton instance
let ollamaClient: OllamaClient | null = null;

export function getOllamaClient(): OllamaClient {
  if (!ollamaClient) {
    ollamaClient = new OllamaClient();
  }
  return ollamaClient;
}

export default OllamaClient;
