import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate as classValidate } from 'class-validator';
import { AiValidationError } from './ai.errors';
import { AiAnalysisResultDto } from './dto/ai-analysis-result.dto';
import {
  AiSentiment,
  AiSeverity,
  IssueType,
  ISSUE_TYPES_BY_CATEGORY,
  TicketCategory,
} from './ai.constants';

/** Fully validated, domain-typed analysis result ready for persistence. */
export interface ValidatedAiAnalysis {
  category: TicketCategory;
  issueType: IssueType;
  severity: AiSeverity;
  sentiment: AiSentiment;
  intent: string;
  requiresTechnician: boolean;
  suggestedTeam: string;
  confidence: number;
}

/**
 * Application-level validation of LLM output.
 *
 * Pipeline (rules/ai-integration.mdc):
 *   LLM response -> JSON -> schema validation (this class)
 *   -> domain validation (issue_type must belong to category)
 *
 * Unknown extra fields are stripped, and any invalid value throws
 * AiValidationError so the orchestrator can retry once and then record a
 * failure — malformed output must never silently enter the business workflow.
 */
@Injectable()
export class AiAnalysisValidator {
  async validate(raw: unknown): Promise<ValidatedAiAnalysis> {
    const normalized = this.normalize(raw);
    if (!normalized) {
      throw new AiValidationError('AI response must be a JSON object');
    }

    const instance = plainToInstance(AiAnalysisResultDto, normalized);
    const errors = await classValidate(instance, { whitelist: true });

    if (errors.length > 0) {
      const messages = errors
        .flatMap((error) => Object.values(error.constraints ?? {}))
        .join('; ');
      throw new AiValidationError(`AI response failed schema validation: ${messages}`);
    }

    // Domain validation: issue_type must belong to the chosen category.
    const category = instance.category as TicketCategory;
    const allowedIssueTypes = ISSUE_TYPES_BY_CATEGORY[category] ?? [];
    if (!allowedIssueTypes.includes(instance.issue_type as IssueType)) {
      throw new AiValidationError(
        `issue_type "${instance.issue_type}" is not valid for category "${instance.category}"`,
      );
    }

    return {
      category,
      issueType: instance.issue_type as IssueType,
      severity: instance.severity as AiSeverity,
      sentiment: instance.sentiment as AiSentiment,
      intent: instance.intent,
      requiresTechnician: instance.requires_technician,
      suggestedTeam: instance.suggested_team,
      confidence: instance.confidence,
    };
  }

  /**
   * Light normalization before strict validation: trims/uppercases enum-ish
   * strings and coerces a numeric confidence that arrived as a string.
   */
  private normalize(raw: unknown): Record<string, unknown> | null {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return null;
    }

    const source = raw as Record<string, unknown>;
    const upper = (value: unknown): unknown =>
      typeof value === 'string' ? value.trim().toUpperCase() : value;

    return {
      category: upper(source.category),
      issue_type: upper(source.issue_type),
      severity: upper(source.severity),
      sentiment: upper(source.sentiment),
      intent: typeof source.intent === 'string' ? this.snakeCaseIntent(source.intent) : source.intent,
      requires_technician: source.requires_technician,
      suggested_team: upper(source.suggested_team),
      confidence: typeof source.confidence === 'string' ? Number(source.confidence) : source.confidence,
    };
  }

  /**
   * Deterministic intent normalization (backend decides — "LLM interprets,
   * backend validates and decides"). Some models occasionally answer with
   * free text (e.g. "Report total internet outage") instead of
   * UPPER_SNAKE_CASE; convert it deterministically so valid interpretations
   * are not discarded: "Report total outage!" -> "REPORT_TOTAL_OUTAGE".
   * Runs BEFORE strict validation so the regex check sees clean input.
   */
  private snakeCaseIntent(intent: string): string {
    return intent
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 100)
      .replace(/_+$/g, '');
  }
}
