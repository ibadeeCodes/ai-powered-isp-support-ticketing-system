import {
  Ticket,
  TicketStatus,
  CreateTicketDto,
  Customer,
  AgentTicketsPage,
  AgentTicketQueryParams,
  AgentCustomersPage,
  AgentCustomerQueryParams,
  AgentCustomerDetail,
  AgentCustomerProfile,
  AgentCustomerTicketsPage,
  AgentCustomerTicketsQueryParams,
  AgentTicketDetail,
} from '@/types/ticket';
import { getAuthHeaders } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Parse an error response from the backend into a human-readable message.
 */
async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const errorData = await res.json();
    if (Array.isArray(errorData?.message)) {
      return errorData.message.join(', ');
    }
    if (errorData?.message) {
      return errorData.message as string;
    }
  } catch {
    // ignore json parse errors
  }
  return fallback;
}

export async function createTicket(data: CreateTicketDto): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to create ticket'));
  }

  return res.json();
}

export async function getDefaultCustomer(): Promise<Customer> {
  const res = await fetch(`${API_BASE_URL}/customers/default`, {
    cache: 'no-store',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch customer profile');
  }

  return res.json();
}

export async function getTickets(): Promise<Ticket[]> {
  const res = await fetch(`${API_BASE_URL}/tickets`, {
    cache: 'no-store',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to fetch tickets'));
  }

  return res.json();
}

export async function getTicketById(id: string): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/tickets/${id}`, {
    cache: 'no-store',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch ticket');
  }

  return res.json();
}

export async function getAgentTickets(
  params: AgentTicketQueryParams = {},
): Promise<AgentTicketsPage> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  if (params.priority) qs.set('priority', params.priority);
  if (params.severity) qs.set('severity', params.severity);
  if (params.sentiment) qs.set('sentiment', params.sentiment);
  if (params.requiresTechnician !== undefined)
    qs.set('requiresTechnician', String(params.requiresTechnician));

  const url = `${API_BASE_URL}/agent/tickets${qs.toString() ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: { ...getAuthHeaders() },
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to fetch agent ticket queue'));
  }

  return res.json();
}

export async function getAgentCustomers(
  params: AgentCustomerQueryParams = {},
): Promise<AgentCustomersPage> {
  const qs = new URLSearchParams();
  if (params.id) qs.set('id', params.id);
  if (params.phone) qs.set('phone', params.phone);
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));

  const url = `${API_BASE_URL}/agent/customers${qs.toString() ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: { ...getAuthHeaders() },
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to fetch customers'));
  }

  return res.json();
}

export async function getAgentCustomerById(id: string): Promise<AgentCustomerProfile> {
  const res = await fetch(`${API_BASE_URL}/agent/customers/${id}`, {
    cache: 'no-store',
    headers: { ...getAuthHeaders() },
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to fetch customer'));
  }

  return res.json();
}

export async function getAgentCustomerTickets(
  customerId: string,
  params: AgentCustomerTicketsQueryParams = {},
): Promise<AgentCustomerTicketsPage> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));

  const url = `${API_BASE_URL}/agent/customers/${customerId}/tickets${qs.toString() ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: { ...getAuthHeaders() },
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to fetch customer tickets'));
  }

  return res.json();
}

/**
 * VS4 — Fetch enriched ticket detail for the agent modal.
 * Calls GET /agent/tickets/:id — returns ticket + customer + AI analysis.
 */
export async function getAgentTicketDetail(id: string): Promise<AgentTicketDetail> {
  const res = await fetch(`${API_BASE_URL}/agent/tickets/${id}`, {
    cache: 'no-store',
    headers: { ...getAuthHeaders() },
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to fetch ticket detail'));
  }

  return res.json();
}

/**
 * VS4 — Update a ticket's status.
 * Calls PATCH /tickets/:id/status — agent/admin only.
 */
export async function updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/tickets/${id}/status`, {
    method: 'PATCH',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to update ticket status'));
  }

  return res.json();
}
