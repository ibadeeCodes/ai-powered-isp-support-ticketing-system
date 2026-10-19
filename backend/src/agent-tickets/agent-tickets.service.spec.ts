import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AgentTicketsService } from './agent-tickets.service';
import { Ticket, TicketPriority, TicketStatus } from '../tickets/entities/ticket.entity';
import { AiAnalysis } from '../ai/entities/ai-analysis.entity';
import { PriorityService } from './priority.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../auth/entities/user.entity';
import { AiAnalysisStatus, AiSentiment, AiSeverity } from '../ai/ai.constants';

describe('AgentTicketsService', () => {
  let service: AgentTicketsService;
  let ticketRepository: jest.Mocked<Repository<Ticket>>;
  let aiAnalysisRepository: jest.Mocked<Repository<AiAnalysis>>;
  let priorityService: PriorityService;

  const mockTeamId = 'team-netops-uuid';
  const otherTeamId = 'team-billing-uuid';

  const mockAgent: AuthenticatedUser = {
    id: 'agent-bilal-uuid',
    name: 'Bilal Khan',
    email: 'bilal@example.com',
    role: UserRole.AGENT,
    supportTeamId: mockTeamId,
  };

  const mockTeammate: AuthenticatedUser = {
    id: 'agent-ahmed-uuid',
    name: 'Ahmed NetOps',
    email: 'ahmed@example.com',
    role: UserRole.AGENT,
    supportTeamId: mockTeamId,
  };

  const agentWithoutTeam: AuthenticatedUser = {
    id: 'agent-no-team-uuid',
    name: 'Rogue Agent',
    email: 'rogue@example.com',
    role: UserRole.AGENT,
    supportTeamId: null,
  };

  beforeEach(async () => {
    const mockTicketRepo = {
      createQueryBuilder: jest.fn(),
      findBy: jest.fn(),
      findOne: jest.fn(),
    };

    const mockAiRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentTicketsService,
        PriorityService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepo,
        },
        {
          provide: getRepositoryToken(AiAnalysis),
          useValue: mockAiRepo,
        },
      ],
    }).compile();

    service = module.get<AgentTicketsService>(AgentTicketsService);
    ticketRepository = module.get(getRepositoryToken(Ticket));
    aiAnalysisRepository = module.get(getRepositoryToken(AiAnalysis));
    priorityService = module.get<PriorityService>(PriorityService);
  });

  describe('getQueue', () => {
    it('returns empty queue immediately if agent has no supportTeamId', async () => {
      const result = await service.getQueue({}, agentWithoutTeam);

      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(1);
      expect(ticketRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('enforces assigned_team_id = agent.supportTeamId and IS NOT NULL on both row and count queries', async () => {
      const mockRowQb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { ticket_id: 'ticket-1', priority_score: '85' },
          { ticket_id: 'ticket-2', priority_score: '60' },
        ]),
      };

      const mockCountQb: any = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ cnt: '2' }),
      };

      ticketRepository.createQueryBuilder
        .mockReturnValueOnce(mockRowQb)
        .mockReturnValueOnce(mockCountQb);

      const ticket1 = {
        id: 'ticket-1',
        ticketNumber: 'TIC-1001',
        subject: 'Fiber line damage',
        description: 'LOS red',
        status: TicketStatus.OPEN,
        priority: TicketPriority.HIGH,
        customerId: 'customer-1',
        assignedTeamId: mockTeamId,
        assignedAgentId: mockAgent.id, // Own ticket
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {} as any,
      } as Ticket;

      const ticket2 = {
        id: 'ticket-2',
        ticketNumber: 'TIC-1002',
        subject: 'BGP flapping',
        description: 'Route flaps',
        status: TicketStatus.OPEN,
        priority: TicketPriority.MEDIUM,
        customerId: 'customer-2',
        assignedTeamId: mockTeamId,
        assignedAgentId: mockTeammate.id, // Teammate's ticket
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {} as any,
      } as Ticket;

      ticketRepository.findBy.mockResolvedValue([ticket1, ticket2]);

      const mockAiQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      aiAnalysisRepository.createQueryBuilder.mockReturnValue(mockAiQb);

      const result = await service.getQueue({}, mockAgent);

      // Verify team condition was applied on row query
      expect(mockRowQb.where).toHaveBeenCalledWith('ticket.assigned_team_id = :teamId', {
        teamId: mockTeamId,
      });
      expect(mockRowQb.andWhere).toHaveBeenCalledWith('ticket.assigned_team_id IS NOT NULL');

      // Verify team condition was applied on count query
      expect(mockCountQb.where).toHaveBeenCalledWith('ticket.assigned_team_id = :teamId', {
        teamId: mockTeamId,
      });
      expect(mockCountQb.andWhere).toHaveBeenCalledWith('ticket.assigned_team_id IS NOT NULL');

      // Both own ticket and teammate's ticket are returned
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('ticket-1');
      expect(result.items[1].id).toBe('ticket-2');
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('findById', () => {
    it('allows agent to view their own ticket within their team and returns assignment details', async () => {
      const ticket = {
        id: 'ticket-own',
        ticketNumber: 'TIC-1001',
        subject: 'Fiber cut',
        description: 'No connectivity',
        status: TicketStatus.OPEN,
        priority: TicketPriority.HIGH,
        customerId: 'cust-1',
        assignedTeamId: mockTeamId,
        assignedAgentId: mockAgent.id,
        assignedTeam: {
          id: mockTeamId,
          name: 'Network Operations',
          code: 'NETWORK_OPERATIONS',
        },
        assignedAgent: {
          id: mockAgent.id,
          name: 'Bilal Khan',
          email: 'bilal@example.com',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: { id: 'cust-1', name: 'John Doe', email: 'john@example.com', phone: '123' } as any,
      } as Ticket;

      ticketRepository.findOne.mockResolvedValue(ticket);
      aiAnalysisRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('ticket-own', mockAgent);

      expect(result.id).toBe('ticket-own');
      expect(result.customer.name).toBe('John Doe');
      expect(result.assignedTeam).toEqual({
        id: mockTeamId,
        name: 'Network Operations',
        code: 'NETWORK_OPERATIONS',
      });
      expect(result.assignedAgent).toEqual({
        id: mockAgent.id,
        name: 'Bilal Khan',
        email: 'bilal@example.com',
      });
    });

    it('allows agent to view a teammate ticket and handles unassigned agent (null) gracefully', async () => {
      const teammateTicket = {
        id: 'ticket-teammate',
        ticketNumber: 'TIC-1002',
        subject: 'Router malfunction',
        description: 'Reboot needed',
        status: TicketStatus.OPEN,
        priority: TicketPriority.MEDIUM,
        customerId: 'cust-2',
        assignedTeamId: mockTeamId,
        assignedAgentId: null, // No agent assigned yet
        assignedTeam: {
          id: mockTeamId,
          name: 'Network Operations',
          code: 'NETWORK_OPERATIONS',
        },
        assignedAgent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: { id: 'cust-2', name: 'Jane Smith', email: 'jane@example.com', phone: '456' } as any,
      } as Ticket;

      ticketRepository.findOne.mockResolvedValue(teammateTicket);
      aiAnalysisRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('ticket-teammate', mockAgent);

      expect(result.id).toBe('ticket-teammate');
      expect(result.assignedTeam?.name).toBe('Network Operations');
      expect(result.assignedAgent).toBeNull();
    });

    it('rejects access with ForbiddenException if ticket belongs to another team', async () => {
      const otherTeamTicket = {
        id: 'ticket-other-team',
        ticketNumber: 'TIC-1003',
        subject: 'Billing discrepancy',
        description: 'Incorrect bill',
        status: TicketStatus.OPEN,
        priority: TicketPriority.LOW,
        customerId: 'cust-3',
        assignedTeamId: otherTeamId, // Different team!
        assignedAgentId: 'other-agent-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {} as any,
      } as Ticket;

      ticketRepository.findOne.mockResolvedValue(otherTeamTicket);

      await expect(service.findById('ticket-other-team', mockAgent)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects access with ForbiddenException if ticket has assigned_team_id = null (unassigned)', async () => {
      const unassignedTicket = {
        id: 'ticket-unassigned',
        ticketNumber: 'TIC-1004',
        subject: 'Legacy ticket',
        description: 'Historical',
        status: TicketStatus.OPEN,
        priority: TicketPriority.MEDIUM,
        customerId: 'cust-4',
        assignedTeamId: null, // Legacy / unassigned
        assignedAgentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {} as any,
      } as Ticket;

      ticketRepository.findOne.mockResolvedValue(unassignedTicket);

      await expect(service.findById('ticket-unassigned', mockAgent)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException if ticket does not exist', async () => {
      ticketRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent-id', mockAgent)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
