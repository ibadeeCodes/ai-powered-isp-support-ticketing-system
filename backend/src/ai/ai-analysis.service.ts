import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AiValidationError } from './ai.errors';
import { AiAnalysisStatus } from './ai.constants';
import { AiAnalysis } from './entities/ai-analysis.entity';
import { GeminiService, GeminiAnalysisResponse } from './gemini.service';
import { AiAnalysisValidator, ValidatedAiAnalysis } from './ai-analysis.validator';
import { PROMPT_VERSION } from './prompt';

export interface AiAnalysisExecutionResult {
  validated: ValidatedAiAnalysis;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  promptVersion: string;
}

/**
 * VS2 orchestrator: Ticket -> LLM -> validate -> persist.
 *
 * Guarantees:
 * - Analysis is an ENRICHMENT operation. It never blocks ticket creation and
 *   never throws into the ticket workflow; failures are recorded as FAILED
 *   analysis rows and logged.
 * - One controlled retry after a failed attempt (provider error or invalid
 *   output), then give up gracefully (rules/ai-integration.mdc).
 */
@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private lastFailureReason: string | null = null;

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(AiAnalysis)
    private readonly aiAnalysisRepository: Repository<AiAnalysis>,
    private readonly geminiService: GeminiService,
    private readonly validator: AiAnalysisValidator,
    private readonly configService: ConfigService,
  ) {}

  /** AI analysis is enabled when the feature flag is on AND a key exists. */
  get enabled(): boolean {
    return (
      this.configService.get<string>('AI_ENABLED', 'true') === 'true' &&
      this.geminiService.isConfigured
    );
  }

  /**
   * Evaluates AI classification on subject and description without persisting.
   * Returns the validated execution result, or null if AI is disabled or fails.
   * Never throws into the calling workflow.
   */
  async runAnalysis(
    subject: string,
    description: string,
  ): Promise<AiAnalysisExecutionResult | null> {
    if (!this.enabled) {
      return null;
    }

    const model = this.geminiService.modelName;
    const promptVersion = PROMPT_VERSION;
    const maxAttempts = this.maxAttempts();
    const retryDelayMs = this.retryDelayMs();
    let lastError = new AiValidationError('AI analysis did not run');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const startedAt = Date.now();
        const response: GeminiAnalysisResponse = await this.geminiService.analyzeTicket(
          subject,
          description,
        );
        const latencyMs = Date.now() - startedAt;

        const parsed = this.parseJsonResponse(response.text);
        const validated = await this.validator.validate(parsed);

        this.lastFailureReason = null;
        return {
          validated,
          model,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          latencyMs,
          promptVersion,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new AiValidationError(String(error));
        this.logger.warn(
          `AI analysis attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`,
        );
        // Controlled backoff before the next attempt — provider overloads
        // (e.g. Gemini 503) rarely clear within the same instant.
        if (attempt < maxAttempts && retryDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    this.lastFailureReason = lastError.message;
    return null;
  }

  /**
   * Persists the AI analysis outcome linked to a newly saved ticket.
   */
  async persistExecutionResult(
    ticketId: string,
    result: AiAnalysisExecutionResult | null,
    failureReason?: string,
  ): Promise<AiAnalysis | null> {
    if (result) {
      return this.persistSuccess(
        ticketId,
        result.validated,
        result.model,
        result.inputTokens,
        result.outputTokens,
        result.latencyMs,
        result.promptVersion,
      );
    }

    if (this.enabled) {
      await this.persistFailure(
        ticketId,
        this.geminiService.modelName,
        PROMPT_VERSION,
        failureReason || this.lastFailureReason || 'AI analysis failed',
      );
    }
    return null;
  }

  /**
   * Retrieves the newest completed AI analysis for a ticket, if one already exists.
   * Useful for idempotency checks during background job retries.
   */
  async getLatestCompletedAnalysis(ticketId: string): Promise<AiAnalysis | null> {
    return this.aiAnalysisRepository.findOne({
      where: { ticketId, status: AiAnalysisStatus.COMPLETED },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Analyze an existing (or just-created) ticket by id.
   * Returns the persisted analysis, or null when analysis was skipped/failed.
   */
  async analyzeTicketById(ticketId: string): Promise<AiAnalysis | null> {
    if (!this.enabled) {
      this.logger.warn(
        `AI analysis skipped for ticket "${ticketId}": AI is disabled or not configured`,
      );
      return null;
    }

    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      this.logger.warn(`AI analysis skipped: ticket "${ticketId}" not found`);
      return null;
    }

    return this.analyzeTicket(ticket);
  }

  /** Analyze a loaded ticket. Never throws — failures are recorded and logged. */
  async analyzeTicket(ticket: Ticket): Promise<AiAnalysis | null> {
    if (!this.enabled) {
      this.logger.warn(
        `AI analysis skipped for ticket "${ticket.id}": AI is disabled or not configured`,
      );
      return null;
    }

    const result = await this.runAnalysis(ticket.subject, ticket.description);
    return this.persistExecutionResult(ticket.id, result, this.lastFailureReason ?? undefined);
  }

  private maxAttempts(): number {
    const retries = parseInt(this.configService.get<string>('AI_MAX_RETRIES', '1'), 10);
    return Number.isFinite(retries) && retries >= 0 ? 1 + retries : 2;
  }

  private retryDelayMs(): number {
    const delay = parseInt(this.configService.get<string>('AI_RETRY_DELAY_MS', '2000'), 10);
    return Number.isFinite(delay) && delay >= 0 ? delay : 2000;
  }

  private parseJsonResponse(text: string): unknown {
    // Defensive cleanup in case a model ever wraps JSON in markdown fences.
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      throw new AiValidationError('AI response was not valid JSON');
    }
  }

  private async persistSuccess(
    ticketId: string,
    validated: ValidatedAiAnalysis,
    model: string,
    inputTokens: number | null,
    outputTokens: number | null,
    latencyMs: number,
    promptVersion: string,
  ): Promise<AiAnalysis> {
    const analysis = this.aiAnalysisRepository.create({
      ticketId,
      status: AiAnalysisStatus.COMPLETED,
      category: validated.category,
      issueType: validated.issueType,
      severity: validated.severity,
      sentiment: validated.sentiment,
      intent: validated.intent,
      requiresTechnician: validated.requiresTechnician,
      suggestedTeam: validated.suggestedTeam,
      confidence: validated.confidence,
      model,
      promptVersion,
      inputTokens,
      outputTokens,
      latencyMs,
      failureReason: null,
    });

    return this.aiAnalysisRepository.save(analysis);
  }

  private async persistFailure(
    ticketId: string,
    model: string,
    promptVersion: string,
    reason: string,
  ): Promise<void> {
    try {
      const analysis = this.aiAnalysisRepository.create({
        ticketId,
        status: AiAnalysisStatus.FAILED,
        model,
        promptVersion,
        failureReason: reason.slice(0, 500),
      });
      await this.aiAnalysisRepository.save(analysis);
    } catch (dbError) {
      this.logger.error(
        `Failed to record AI analysis failure for ticket "${ticketId}": ${
          dbError instanceof Error ? dbError.message : 'unknown error'
        }`,
      );
    }

    this.logger.error(`AI analysis failed for ticket "${ticketId}": ${reason}`);
  }
}
