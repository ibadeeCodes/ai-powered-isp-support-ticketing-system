export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
}

export interface SupportTeamSummary {
  id: string;
  name: string;
  code?: string;
}

export interface AgentSummary {
  id: string;
  name: string;
  email?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  customerId: string;
  customer?: Customer;
  assignedTeamId?: string | null;
  assignedTeam?: SupportTeamSummary | null;
  assignedAgentId?: string | null;
  assignedAgent?: AgentSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketDto {
  subject: string;
  description: string;
  customerId?: string;
}

// ---------------------------------------------------------------------------
// VS3 — Agent ticket queue types (mirrors backend AgentTicket* DTOs)
// ---------------------------------------------------------------------------

export interface AgentTicketAiInsight {
  category: string;
  issueType: string;
  severity: string;
  sentiment: string;
  intent: string;
  requiresTechnician: boolean;
  confidence: number;
}

export interface PriorityFactors {
  severity: number;
  technicianRequired: number;
  waitingTime: number;
  sentiment: number;
}

export interface AgentTicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  priorityScore: number;
  priorityFactors: PriorityFactors;
  createdAt: string;
  /** null when no completed AI analysis exists */
  ai: AgentTicketAiInsight | null;
}

export interface AgentTicketsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AgentTicketsPage {
  items: AgentTicketItem[];
  pagination: AgentTicketsPagination;
}

export interface AgentTicketQueryParams {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  severity?: string;
  sentiment?: string;
  requiresTechnician?: boolean;
}

// ---------------------------------------------------------------------------
// VS3 — Agent customer lookup types (mirrors backend AgentCustomer* DTOs)
// ---------------------------------------------------------------------------

export interface AgentCustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface AgentCustomersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AgentCustomersPage {
  items: AgentCustomerItem[];
  pagination: AgentCustomersPagination;
}

export interface AgentCustomerQueryParams {
  id?: string;
  phone?: string;
  page?: number;
  limit?: number;
}

export interface AgentCustomerTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

export interface AgentCustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export type AgentCustomerDetail = AgentCustomerProfile;

export interface AgentCustomerTicketsPage {
  items: AgentCustomerTicket[];
  pagination: AgentCustomersPagination;
}

export interface AgentCustomerTicketsQueryParams {
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// VS4 — Agent ticket detail modal types
// ---------------------------------------------------------------------------

export interface AgentTicketDetailCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface AgentTicketDetailAi {
  category: string;
  issueType: string;
  severity: string;
  sentiment: string;
  intent: string;
  requiresTechnician: boolean;
  confidence: number;
  analysedAt: string;
}

export interface AgentTicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  priorityScore: number;
  createdAt: string;
  updatedAt: string;
  customer: AgentTicketDetailCustomer;
  ai: AgentTicketDetailAi | null;
  assignedTeam?: SupportTeamSummary | null;
  assignedAgent?: AgentSummary | null;
}



