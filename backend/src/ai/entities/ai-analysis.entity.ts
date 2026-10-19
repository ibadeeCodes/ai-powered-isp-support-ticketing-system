import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { AiAnalysisStatus, AiSentiment, AiSeverity, TicketCategory } from '../ai.constants';

/**
 * VS2 — AI Ticket Analysis.
 *
 * Relationship decision (explicit, not inherited silently from the ERD):
 * ai_analyses is 1:N with tickets (multiple analyses per ticket are allowed)
 * so AI results can be re-run and versioned over time. Consumers should treat
 * the newest row per ticket as the current analysis. This matches
 * rules/database.mdc ("This allows multiple AI analyses for the same ticket").
 *
 * Classification columns are nullable so a FAILED analysis row (LLM outage,
 * invalid output) can still be persisted for observability without fabricating
 * classification values.
 */
@Entity({ name: 'ai_analyses' })
@Index('idx_ai_analyses_ticket_id', ['ticketId'])
export class AiAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ type: 'enum', enum: TicketCategory, nullable: true })
  category: TicketCategory | null;

  @Column({ name: 'issue_type', type: 'varchar', length: 100, nullable: true })
  issueType: string | null;

  @Column({ type: 'enum', enum: AiSeverity, nullable: true })
  severity: AiSeverity | null;

  @Column({ type: 'enum', enum: AiSentiment, nullable: true })
  sentiment: AiSentiment | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  intent: string | null;

  @Column({ name: 'requires_technician', type: 'boolean', nullable: true })
  requiresTechnician: boolean | null;

  @Column({ name: 'suggested_team', type: 'varchar', length: 50, nullable: true })
  suggestedTeam: string | null;

  @Column({ type: 'float', nullable: true })
  confidence: number | null;

  @Column({ type: 'varchar', length: 100 })
  model: string;

  @Column({ name: 'prompt_version', type: 'varchar', length: 20 })
  promptVersion: string;

  @Column({ name: 'input_tokens', type: 'int', nullable: true })
  inputTokens: number | null;

  @Column({ name: 'output_tokens', type: 'int', nullable: true })
  outputTokens: number | null;

  @Column({ name: 'latency_ms', type: 'int', nullable: true })
  latencyMs: number | null;

  @Column({ type: 'enum', enum: AiAnalysisStatus, default: AiAnalysisStatus.COMPLETED })
  status: AiAnalysisStatus;

  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
