/**
 * Hybrid CLIP Embedding Client
 *
 * Primary: Local GPU at https://clip.inkdex.io (A2000 12GB)
 * Fallback: Modal.com serverless GPU
 *
 * Features:
 * - Automatic failover (5s timeout on local)
 * - Health check caching (1 min TTL)
 * - Structured logging for observability
 * - Drop-in replacement for modal-client.ts
 */

interface _EmbeddingResult {
  embedding: number[];
  source: 'local' | 'modal';
  latency: number;
  fallbackUsed: boolean;
}

interface HealthCheckResult {
  status: string;
  gpu_available?: boolean;
  model_loaded?: boolean;
  model_name?: string;
  embedding_dim?: number;
}

class HybridEmbeddingClient {
  private localUrl: string;
  private modalUrl: string;
  private localTimeout: number;
  private enableFallback: boolean;
  private preferLocal: boolean;
  private localHealthy: boolean = true;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000; // 1 minute

  private localApiKey: string;

  constructor() {
    this.localUrl = process.env.LOCAL_CLIP_URL || 'https://clip.inkdex.io';
    this.modalUrl = process.env.MODAL_FUNCTION_URL || '';
    this.localApiKey = process.env.CLIP_API_KEY || '';

    // Parse and validate timeout
    const timeoutStr = process.env.LOCAL_CLIP_TIMEOUT || '5000';
    const timeout = parseInt(timeoutStr, 10);
    if (isNaN(timeout) || timeout < 0 || timeout > 60000) {
      throw new Error(`Invalid LOCAL_CLIP_TIMEOUT: must be 0-60000ms, got "${timeoutStr}"`);
    }
    this.localTimeout = timeout;

    this.enableFallback = process.env.ENABLE_MODAL_FALLBACK !== 'false';
    this.preferLocal = process.env.PREFER_LOCAL_CLIP !== 'false';
  }

  /**
   * Check local GPU health (cached for 1 minute)
   */
  private async checkLocalHealth(): Promise<boolean> {
    const now = Date.now();

    // Use cached result if recent
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.localHealthy;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const headers: HeadersInit = {};
      if (this.localApiKey) {
        headers['Authorization'] = `Bearer ${this.localApiKey}`;
      }

      const response = await fetch(`${this.localUrl}/health`, {
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data: HealthCheckResult = await response.json();
        this.localHealthy = data.status === 'ok' && data.gpu_available !== false;
      } else {
        this.localHealthy = false;
      }
    } catch (error) {
      console.warn('[HybridClient] Local health check failed:', error);
      this.localHealthy = false;
    }

    this.lastHealthCheck = now;
    return this.localHealthy;
  }

  /**
   * Generate image embedding with automatic failover
   */
  async generateImageEmbedding(imageFile: File): Promise<number[]> {
    // Prevent client-side execution (API keys must not be exposed in browser)
    if (typeof window !== 'undefined') {
      throw new Error('Embedding client cannot be used in browser context.')
    }

    const startTime = Date.now();

    // Validate input (same as modal-client.ts)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    if (!ALLOWED_TYPES.includes(imageFile.type)) {
      throw new Error(`Invalid file type: ${imageFile.type}. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }
    if (imageFile.size > MAX_SIZE) {
      throw new Error('File too large (max 10MB)');
    }

    // Convert to base64
    const buffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Try local first
    if (this.preferLocal && await this.checkLocalHealth()) {
      try {
        const embedding = await this.callLocalImageEmbedding(base64);
        const latency = Date.now() - startTime;

        this.logEmbeddingGeneration('image', 'local', latency, false);

        return embedding;
      } catch (error) {
        console.warn('[HybridClient] Local GPU failed, trying Modal fallback:', error);
        this.localHealthy = false; // Mark as unhealthy for next request

        if (!this.enableFallback) {
          throw error;
        }
      }
    }

    // Fallback to Modal
    if (!this.modalUrl) {
      throw new Error('Modal fallback URL not configured');
    }

    const embedding = await this.callModalImageEmbedding(base64);
    const latency = Date.now() - startTime;

    this.logEmbeddingGeneration('image', 'modal', latency, true);

    return embedding;
  }

  /**
   * Generate text embedding with automatic failover
   */
  async generateTextEmbedding(text: string): Promise<number[]> {
    // Prevent client-side execution (API keys must not be exposed in browser)
    if (typeof window !== 'undefined') {
      throw new Error('Embedding client cannot be used in browser context.')
    }

    const startTime = Date.now();

    // Validate
    const trimmedText = text.trim();
    if (!trimmedText || trimmedText.length < 3) {
      throw new Error('Text too short (min 3 characters)');
    }
    if (trimmedText.length > 500) {
      throw new Error('Text too long (max 500 characters)');
    }

    // Try local first
    if (this.preferLocal && await this.checkLocalHealth()) {
      try {
        const embedding = await this.callLocalTextEmbedding(trimmedText);
        const latency = Date.now() - startTime;

        this.logEmbeddingGeneration('text', 'local', latency, false);

        return embedding;
      } catch (error) {
        console.warn('[HybridClient] Local GPU failed, trying Modal fallback:', error);
        this.localHealthy = false;

        if (!this.enableFallback) {
          throw error;
        }
      }
    }

    // Fallback to Modal
    if (!this.modalUrl) {
      throw new Error('Modal fallback URL not configured');
    }

    const embedding = await this.callModalTextEmbedding(trimmedText);
    const latency = Date.now() - startTime;

    this.logEmbeddingGeneration('text', 'modal', latency, true);

    return embedding;
  }

  /**
   * Call local GPU for image embedding
   */
  private async callLocalImageEmbedding(base64: string): Promise<number[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.localTimeout);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (this.localApiKey) {
        headers['Authorization'] = `Bearer ${this.localApiKey}`;
      }

      const response = await fetch(`${this.localUrl}/generate_single_embedding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image_data: base64 }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Local GPU error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Validate embedding
      if (!Array.isArray(data.embedding)) {
        throw new Error('Invalid response: embedding is not an array');
      }
      if (data.embedding.length !== 768) {
        throw new Error(`Invalid embedding dimension: ${data.embedding.length} (expected 768)`);
      }
      if (!data.embedding.every((n: unknown) => typeof n === 'number' && isFinite(n))) {
        throw new Error('Invalid embedding from local GPU: contains non-numeric values');
      }

      return data.embedding;
    } catch (error) {
      clearTimeout(timeoutId);

      // Provide helpful error messages
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Local GPU timeout after ${this.localTimeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Call local GPU for text embedding
   */
  private async callLocalTextEmbedding(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.localTimeout);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (this.localApiKey) {
        headers['Authorization'] = `Bearer ${this.localApiKey}`;
      }

      const response = await fetch(`${this.localUrl}/generate_text_query_embedding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Local GPU error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Validate
      if (!Array.isArray(data.embedding) || data.embedding.length !== 768) {
        throw new Error(`Invalid embedding from local GPU: ${data.embedding?.length || 0} dimensions`);
      }
      if (!data.embedding.every((n: unknown) => typeof n === 'number' && isFinite(n))) {
        throw new Error('Invalid embedding from local GPU: contains non-numeric values');
      }

      return data.embedding;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Local GPU timeout after ${this.localTimeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Call Modal.com for image embedding
   */
  private async callModalImageEmbedding(base64: string): Promise<number[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for Modal

    try {
      const response = await fetch(`${this.modalUrl}/generate_single_embedding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: base64 }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Modal error: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.embedding) || data.embedding.length !== 768) {
        throw new Error(`Invalid embedding from Modal: ${data.embedding?.length || 0} dimensions`);
      }
      if (!data.embedding.every((n: unknown) => typeof n === 'number' && isFinite(n))) {
        throw new Error('Invalid embedding from Modal: contains non-numeric values');
      }

      return data.embedding;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Modal timeout after 30000ms`);
      }
      throw error;
    }
  }

  /**
   * Call Modal.com for text embedding
   */
  private async callModalTextEmbedding(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for Modal

    try {
      const response = await fetch(`${this.modalUrl}/generate_text_query_embedding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Modal error: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.embedding) || data.embedding.length !== 768) {
        throw new Error(`Invalid embedding from Modal: ${data.embedding?.length || 0} dimensions`);
      }
      if (!data.embedding.every((n: unknown) => typeof n === 'number' && isFinite(n))) {
        throw new Error('Invalid embedding from Modal: contains non-numeric values');
      }

      return data.embedding;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Modal timeout after 30000ms`);
      }
      throw error;
    }
  }

  /**
   * Log embedding generation for observability
   */
  private logEmbeddingGeneration(
    type: 'image' | 'text',
    source: 'local' | 'modal',
    latency: number,
    fallbackUsed: boolean
  ): void {
    // Structured JSON logging for log aggregation
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'embedding',
      type,
      source,
      latency_ms: latency,
      fallback_used: fallbackUsed,
      success: true
    }));

    // Human-readable console message
    const emoji = source === 'local' ? '✅' : '⚠️';
    const fallbackMsg = fallbackUsed ? ' (fallback)' : '';
    console.log(`[HybridClient] ${emoji} ${source} GPU${fallbackMsg} (${latency}ms)`);
  }
}

// Export singleton instance
export const hybridClient = new HybridEmbeddingClient();

/**
 * Generate embedding from image file
 * Drop-in replacement for modal-client.ts
 */
export async function generateImageEmbedding(imageFile: File): Promise<number[]> {
  return hybridClient.generateImageEmbedding(imageFile);
}

/**
 * Generate embedding from text query
 * Drop-in replacement for modal-client.ts
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  return hybridClient.generateTextEmbedding(text);
}

/**
 * Generate hybrid embedding (image + text weighted average)
 * Drop-in replacement for modal-client.ts
 */
export async function generateHybridEmbedding(
  imageFile: File,
  text: string,
  imageWeight: number = 0.7
): Promise<number[]> {
  // Generate both embeddings
  const imageEmbedding = await hybridClient.generateImageEmbedding(imageFile);
  const textEmbedding = await hybridClient.generateTextEmbedding(text);

  const textWeight = 1 - imageWeight;

  // Weighted average
  const hybrid = imageEmbedding.map((val, i) =>
    val * imageWeight + textEmbedding[i] * textWeight
  );

  // L2 normalize
  const norm = Math.sqrt(hybrid.reduce((sum, val) => sum + val * val, 0));
  return hybrid.map(val => val / norm);
}
