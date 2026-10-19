import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderError } from './ai.errors';
import {
  ALL_ISSUE_TYPES,
  ALL_SENTIMENTS,
  ALL_SEVERITIES,
  ALL_TICKET_CATEGORIES,
  SUPPORTED_TEAM_CODES,
} from './ai.constants';
import { buildTicketAnalysisPrompt, TICKET_ANALYSIS_SYSTEM_INSTRUCTION } from './prompt';

export interface GeminiAnalysisResponse {
  text: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

interface GeminiGenerateContentResponse {
  modelVersion?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Structured-output schema (OpenAPI subset) enforcing the exact VS2 analysis
 * contract. Gemini enforces this schema server-side; the backend STILL
 * validates every response at the application level because LLM output is
 * always treated as untrusted (rules/ai-integration.mdc).
 */
const TICKET_ANALYSIS_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    category: {
      type: 'STRING',
      enum: ALL_TICKET_CATEGORIES,
      description: 'Highest-level ticket category.',
    },
    issue_type: {
      type: 'STRING',
      enum: ALL_ISSUE_TYPES,
      description: 'Specific issue type; MUST belong to the chosen category.',
    },
    severity: {
      type: 'STRING',
      enum: ALL_SEVERITIES,
      description: 'Operational impact: LOW, MEDIUM, HIGH or CRITICAL.',
    },
    sentiment: {
      type: 'STRING',
      enum: ALL_SENTIMENTS,
      description: 'Customer emotional tone.',
    },
    intent: {
      type: 'STRING',
      description: "Customer goal in UPPER_SNAKE_CASE, e.g. 'RESTORE_INTERNET'.",
    },
    requires_technician: {
      type: 'BOOLEAN',
      description: 'True when on-site physical intervention is likely required.',
    },
    suggested_team: {
      type: 'STRING',
      enum: SUPPORTED_TEAM_CODES,
      description: 'Recommended support team code: NETWORK_OPERATIONS, TECHNICAL_SUPPORT, BILLING, or INSTALLATION.',
    },
    confidence: {
      type: 'NUMBER',
      description: 'Classification certainty between 0 and 1.',
    },
  },
  required: [
    'category',
    'issue_type',
    'severity',
    'sentiment',
    'intent',
    'requires_technician',
    'suggested_team',
    'confidence',
  ],
  propertyOrdering: [
    'category',
    'issue_type',
    'severity',
    'sentiment',
    'intent',
    'requires_technician',
    'suggested_team',
    'confidence',
  ],
} as const;

/**
 * Thin Gemini client for structured ticket analysis (recommended model:
 * gemini-2.5-flash). Uses the REST API directly with structured output
 * (responseSchema) instead of introducing an SDK dependency.
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = configService.get<string>('GEMINI_API_KEY');
    // 'gemini-flash-latest' is a stable alias that always points to the
    // current recommended Flash model (fixed model names like
    // 'gemini-2.5-flash' can be retired by Google and start returning 404).
    this.model = configService.get<string>('AI_MODEL', 'gemini-flash-latest');
    this.timeoutMs = parseInt(configService.get<string>('AI_TIMEOUT_MS', '15000'), 10);
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  get modelName(): string {
    return this.model;
  }

  /**
   * Sends the ticket to Gemini and returns the raw model text plus usage
   * metadata. Throws AiProviderError on any transport/provider failure
   * (timeout, HTTP error, empty response). Never throws other error types.
   */
  async analyzeTicket(subject: string, description: string): Promise<GeminiAnalysisResponse> {
    if (!this.isConfigured) {
      throw new AiProviderError('Gemini API key is not configured');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${GEMINI_API_BASE_URL}/models/${this.model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey as string,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: TICKET_ANALYSIS_SYSTEM_INSTRUCTION }] },
          contents: [
            {
              role: 'user',
              parts: [{ text: buildTicketAnalysisPrompt(subject, description) }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            // Generous headroom: newer Flash models may spend tokens thinking
            // before emitting the final JSON, and a truncated response is
            // worse than a slightly larger budget for a ~60-token payload.
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            responseSchema: TICKET_ANALYSIS_RESPONSE_SCHEMA,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Do not leak raw provider error bodies into exceptions/logs.
        throw new AiProviderError(`Gemini API request failed with status ${response.status}`);
      }

      const data = (await response.json()) as GeminiGenerateContentResponse;
      const candidate = data.candidates?.[0];

      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        throw new AiProviderError(
          `Gemini generation stopped early (finishReason: ${candidate.finishReason})`,
        );
      }

      const text = (candidate?.content?.parts ?? [])
        .map((part) => part.text ?? '')
        .join('')
        .trim();

      if (!text) {
        throw new AiProviderError('Gemini returned an empty response');
      }

      return {
        text,
        model: data.modelVersion ?? this.model,
        inputTokens: data.usageMetadata?.promptTokenCount ?? null,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? null,
      };
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AiProviderError(`Gemini request timed out after ${this.timeoutMs}ms`);
      }
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Gemini request failed: ${message}`);
      throw new AiProviderError(`Gemini request failed: ${message}`);
    } finally {
      clearTimeout(timer);
    }
  }
}
