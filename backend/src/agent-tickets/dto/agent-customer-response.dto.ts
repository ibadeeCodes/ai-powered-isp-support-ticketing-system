/**
 * Response DTOs for the agent customer endpoints.
 * Plain objects — no entity leakage.
 */

export interface AgentCustomerItemDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
}

export interface AgentCustomerPaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AgentCustomersPageDto {
  items: AgentCustomerItemDto[];
  pagination: AgentCustomerPaginationDto;
}

/**
 * Customer profile only — no tickets.
 * Returned by GET /agent/customers/:customerId
 */
export interface AgentCustomerProfileDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
}

/** Legacy alias for backwards compatibility if needed */
export type AgentCustomerDetailDto = AgentCustomerProfileDto;

/**
 * A ticket summary row on the customer detail page.
 * Returned inside AgentCustomerTicketsPageDto.
 */
export interface AgentCustomerTicketDto {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
}

/**
 * Paginated ticket list for a customer.
 * Returned by GET /agent/customers/:customerId/tickets
 */
export interface AgentCustomerTicketsPageDto {
  items: AgentCustomerTicketDto[];
  pagination: AgentCustomerPaginationDto;
}
