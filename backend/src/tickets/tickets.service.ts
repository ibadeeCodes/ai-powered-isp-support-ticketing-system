import { ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Ticket, TicketPriority, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CustomersService } from '../customers/customers.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../auth/entities/user.entity';
import { AiAnalysisService } from '../ai/ai-analysis.service';
import { AiAnalysis } from '../ai/entities/ai-analysis.entity';
import {
  TICKET_PROCESSING_QUEUE,
  ANALYZE_AND_ASSIGN_JOB,
  TicketAnalysisJobData,
} from './ticket.processor';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly customersService: CustomersService,
    private readonly dataSource: DataSource,
    private readonly aiAnalysisService: AiAnalysisService,
    @InjectQueue(TICKET_PROCESSING_QUEUE)
    private readonly ticketQueue: Queue<TicketAnalysisJobData>,
  ) {}

  async create(createTicketDto: CreateTicketDto, user: AuthenticatedUser): Promise<Ticket> {
    const targetCustomerId = this.resolveCustomerId(createTicketDto.customerId, user);

    // Verify customer exists in database
    let customer = await this.customersService.findById(targetCustomerId).catch(() => null);

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${targetCustomerId}" not found`);
    }

    // Generate human-readable sequential ticket number (e.g. TIC-1001)
    let ticketNumber: string;
    try {
      const seqResult = await this.dataSource.query(
        "SELECT nextval('ticket_number_seq') AS next_val;",
      );
      ticketNumber = `TIC-${seqResult[0].next_val}`;
    } catch {
      // Fallback if sequence is not available in non-PostgreSQL / test environments
      const count = await this.ticketRepository.count();
      ticketNumber = `TIC-${1001 + count}`;
    }

    // 1. Construct bare ticket and persist immediately (< 50ms response)
    const ticket = this.ticketRepository.create({
      subject: createTicketDto.subject,
      description: createTicketDto.description,
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
      customerId: customer.id,
      ticketNumber,
      assignedTeamId: null,
      assignedAgentId: null,
    });

    const savedTicket = await this.ticketRepository.save(ticket);

    // 2. Offload AI analysis, team resolution, and agent assignment to background BullMQ worker
    try {
      await this.ticketQueue.add(
        ANALYZE_AND_ASSIGN_JOB,
        {
          ticketId: savedTicket.id,
          subject: savedTicket.subject,
          description: savedTicket.description,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400 * 7 },
        },
      );
    } catch (queueError: unknown) {
      this.logger.error(
        `Failed to enqueue ticket ${savedTicket.id} for background analysis: ${
          queueError instanceof Error ? queueError.message : 'unknown error'
        }`,
      );
    }

    return savedTicket;
  }

  private resolveCustomerId(
    requestedCustomerId: string | undefined,
    user: AuthenticatedUser,
  ): string {
    if (user.role === UserRole.CUSTOMER) {
      if (!user.customerId) {
        throw new UnauthorizedException('Authenticated customer identity is missing');
      }
      if (requestedCustomerId && requestedCustomerId !== user.customerId) {
        throw new ForbiddenException('Customers can only create tickets for their own account');
      }
      return user.customerId;
    }

    const targetCustomerId = requestedCustomerId || user.customerId;
    if (!targetCustomerId) {
      throw new UnauthorizedException(
        'Agent authentication requires a customer ID when creating a ticket',
      );
    }
    return targetCustomerId;
  }

  async findAll(user: AuthenticatedUser): Promise<Ticket[]> {
    // Customers can only see their own tickets
    if (user.role === UserRole.CUSTOMER) {
      if (!user.customerId) {
        throw new UnauthorizedException('Authenticated customer identity is missing');
      }
      return this.ticketRepository.find({
        where: { customerId: user.customerId },
        relations: ['customer'],
        order: { createdAt: 'DESC' },
      });
    }

    // Agents and admins can see all tickets
    return this.ticketRepository.find({
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, user: AuthenticatedUser): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['customer', 'assignedTeam', 'assignedAgent'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${id}" not found`);
    }

    if (user.role === UserRole.CUSTOMER && ticket.customerId !== user.customerId) {
      throw new ForbiddenException('Customers can only view their own tickets');
    }

    if (ticket.assignedAgent && 'password' in ticket.assignedAgent) {
      delete (ticket.assignedAgent as any).password;
    }

    return ticket;
  }

  /**
   * Manually (re-)run AI analysis for an existing ticket.
   * Agent-facing only (see tickets.controller.ts) — customers never see it.
   */
  async triggerAnalysis(ticketId: string, user: AuthenticatedUser): Promise<AiAnalysis | null> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${ticketId}" not found`);
    }

    if (user.role === UserRole.AGENT) {
      if (!user.supportTeamId || ticket.assignedTeamId !== user.supportTeamId) {
        throw new ForbiddenException('You do not have access to this ticket');
      }
    }

    return this.aiAnalysisService.analyzeTicket(ticket);
  }

  /**
   * VS4 — Update ticket status (agent/admin only).
   * Customers are blocked at the route level via @Roles guard.
   */
  async updateStatus(id: string, status: TicketStatus, user: AuthenticatedUser): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({ where: { id } });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${id}" not found`);
    }

    if (user.role === UserRole.AGENT) {
      // Team-level check (visibility)
      if (!user.supportTeamId || ticket.assignedTeamId !== user.supportTeamId) {
        throw new ForbiddenException('You do not have access to this ticket');
      }

      // Individual ownership check (write permission)
      if (ticket.assignedAgentId !== user.id) {
        throw new ForbiddenException('You can only update status of tickets assigned to you');
      }
    }

    ticket.status = status;
    return this.ticketRepository.save(ticket);
  }
}

