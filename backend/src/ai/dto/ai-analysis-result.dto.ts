import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ALL_ISSUE_TYPES,
  ALL_SEVERITIES,
  ALL_SENTIMENTS,
  ALL_TICKET_CATEGORIES,
  SUPPORTED_TEAM_CODES,
} from '../ai.constants';

/**
 * Schema-level contract for the LLM's structured response.
 *
 * Field names intentionally match the LLM's JSON keys (snake_case).
 * Every value is restricted to the domain's allowed sets — anything else is
 * rejected before it can reach persistence (rules/ai-integration.mdc).
 */
export class AiAnalysisResultDto {
  @IsIn(ALL_TICKET_CATEGORIES, {
    message: `category must be one of: ${ALL_TICKET_CATEGORIES.join(', ')}`,
  })
  category!: string;

  @IsIn(ALL_ISSUE_TYPES, {
    message: `issue_type must be one of: ${ALL_ISSUE_TYPES.join(', ')}`,
  })
  issue_type!: string;

  @IsIn(ALL_SEVERITIES, {
    message: `severity must be one of: ${ALL_SEVERITIES.join(', ')}`,
  })
  severity!: string;

  @IsIn(ALL_SENTIMENTS, {
    message: `sentiment must be one of: ${ALL_SENTIMENTS.join(', ')}`,
  })
  sentiment!: string;

  @IsString()
  @IsNotEmpty({ message: 'intent is required' })
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'intent must be UPPER_SNAKE_CASE (e.g. RESTORE_INTERNET)',
  })
  @MaxLength(100, { message: 'intent must be at most 100 characters' })
  intent!: string;

  @IsBoolean({ message: 'requires_technician must be a boolean' })
  requires_technician!: boolean;

  @IsIn(SUPPORTED_TEAM_CODES, {
    message: `suggested_team must be one of: ${SUPPORTED_TEAM_CODES.join(', ')}`,
  })
  suggested_team!: string;

  @IsNumber({}, { message: 'confidence must be a number' })
  @Min(0, { message: 'confidence must be between 0 and 1' })
  @Max(1, { message: 'confidence must be between 0 and 1' })
  confidence!: number;
}

