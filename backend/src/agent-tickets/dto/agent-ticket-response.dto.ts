import { TicketPriority, TicketStatus } from '../../tickets/entities/ticket.entity';
import { PriorityFactors } from '../priority.service';

/**
 * VS3 — dashboard response DTOs (spec §12).
 *
 * The API never exposes database entities; these plain DTOs are produced by
 * an explicit mapping in AgentTicketsService.
 */

/** Persisted AI analysis of the ticket's newest COMPLETED analysis, if any. */
export interface AgentTicketAiInsightDto {
  category: string;
  issueType: string;
  severity: string;
  sentiment: string;
  intent: string;
  requiresTechnician: boolean;
  confidence: number;
}

/** One dashboard row for the agent ticket queue. */
export interface AgentTicketItemDto {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  /** Operational priority computed by the deterministic PriorityService. */
  priority: TicketPriority;
  priorityScore: number;
  /** Explainable breakdown of priorityScore (spec §6/§8). */
  priorityFactors: PriorityFactors;
  createdAt: Date;
  /** null when no completed AI analysis exists — never fabricated (spec §13). */
  ai: AgentTicketAiInsightDto | null;
}

export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AgentTicketsPageDto {
  items: AgentTicketItemDto[];
  pagination: PaginationDto;
}
