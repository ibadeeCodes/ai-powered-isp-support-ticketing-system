import { TicketPriority, TicketStatus } from '../../tickets/entities/ticket.entity';
import { PriorityFactors } from '../priority.service';

/**
 * VS4 — Agent ticket detail response DTO.
 *
 * Returned by GET /agent/tickets/:id.
 * Contains ticket, customer summary, AI analysis, and computed priority —
 * everything the agent detail modal needs in a single call.
 */

export interface AgentTicketDetailCustomerDto {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface AgentTicketDetailAiDto {
  category: string;
  issueType: string;
  severity: string;
  sentiment: string;
  intent: string;
  requiresTechnician: boolean;
  confidence: number;
  analysedAt: Date;
}

export interface AgentTicketDetailTeamDto {
  id: string;
  name: string;
  code: string;
}

export interface AgentTicketDetailAgentDto {
  id: string;
  name: string;
  email: string;
}

export interface AgentTicketDetailDto {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  priorityScore: number;
  priorityFactors: PriorityFactors;
  createdAt: Date;
  updatedAt: Date;
  customer: AgentTicketDetailCustomerDto;
  /** null when no COMPLETED AI analysis exists for this ticket. */
  ai: AgentTicketDetailAiDto | null;
  assignedTeam: AgentTicketDetailTeamDto | null;
  assignedAgent: AgentTicketDetailAgentDto | null;
}

