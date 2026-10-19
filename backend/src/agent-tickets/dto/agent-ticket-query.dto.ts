import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { TicketPriority, TicketStatus } from '../../tickets/entities/ticket.entity';
import { AiSentiment, AiSeverity, TicketCategory } from '../../ai/ai.constants';

/**
 * VS3 — validated query parameters for the agent ticket queue.
 *
 * Filter values are restricted to known domain enums; page size is capped.
 * Arbitrary query parameters are rejected by the global ValidationPipe
 * (forbidNonWhitelisted) so no arbitrary column names can reach the query.
 */
export class AgentTicketQueryDto {
  @IsOptional()
  @IsIn(Object.values(TicketStatus), { message: 'status must be a valid ticket status' })
  status?: TicketStatus;

  @IsOptional()
  @IsIn(Object.values(TicketCategory), { message: 'category must be a valid ticket category' })
  category?: TicketCategory;

  @IsOptional()
  @IsIn(Object.values(AiSeverity), { message: 'severity must be a valid AI severity' })
  severity?: AiSeverity;

  @IsOptional()
  @IsIn(Object.values(AiSentiment), { message: 'sentiment must be a valid AI sentiment' })
  sentiment?: AiSentiment;

  @IsOptional()
  @IsIn(Object.values(TicketPriority), { message: 'priority must be a valid priority' })
  priority?: TicketPriority;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean({ message: 'requiresTechnician must be true or false' })
  requiresTechnician?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must be at most 100' })
  limit?: number = 20;
}
