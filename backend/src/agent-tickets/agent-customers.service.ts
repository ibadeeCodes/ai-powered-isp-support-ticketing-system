import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AgentCustomerQueryDto } from './dto/agent-customer-query.dto';
import { AgentCustomerTicketsQueryDto } from './dto/agent-customer-tickets-query.dto';
import {
  AgentCustomerItemDto,
  AgentCustomersPageDto,
  AgentCustomerProfileDto,
  AgentCustomerTicketDto,
  AgentCustomerTicketsPageDto,
} from './dto/agent-customer-response.dto';

/**
 * Agent customer lookup service.
 *
 * Supports two filter modes:
 *  - id:    exact UUID match (returns 0 or 1 result)
 *  - phone: partial ILIKE match (useful for phone-in intake, spec §VS2)
 *
 * Both are optional — omitting all filters returns all customers paginated.
 * Results are ordered by name ASC as a stable default.
 */
@Injectable()
export class AgentCustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async search(query: AgentCustomerQueryDto): Promise<AgentCustomersPageDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.customerRepository
      .createQueryBuilder('customer')
      .orderBy('customer.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    // Exact UUID match — mutually exclusive with phone search
    if (query.id) {
      qb.andWhere('customer.id = :id', { id: query.id });
    }

    // Partial phone search: ILIKE lets agents type a partial number
    if (query.phone) {
      qb.andWhere('customer.phone ILIKE :phone', {
        phone: `%${query.phone}%`,
      });
    }

    const [customers, total] = await qb.getManyAndCount();

    return {
      items: customers.map(this.toItemDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Fetch customer profile details only (no tickets).
   * Used by GET /agent/customers/:customerId.
   */
  async findProfileById(customerId: string): Promise<AgentCustomerProfileDto> {
    const customer = await this.customerRepository.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${customerId}" not found`);
    }

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt,
    };
  }

  /**
   * Fetch paginated tickets for a specific customer.
   * Used by GET /agent/customers/:customerId/tickets.
   */
  async findTicketsByCustomerId(
    customerId: string,
    query: AgentCustomerTicketsQueryDto,
  ): Promise<AgentCustomerTicketsPageDto> {
    const customer = await this.customerRepository.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${customerId}" not found`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [tickets, total] = await this.ticketRepository.findAndCount({
      where: { customerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: tickets.map(this.toTicketDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private toItemDto(customer: Customer): AgentCustomerItemDto {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt,
    };
  }

  private toTicketDto(ticket: Ticket): AgentCustomerTicketDto {
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
    };
  }
}
