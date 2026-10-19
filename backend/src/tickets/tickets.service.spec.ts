import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { Ticket, TicketPriority, TicketStatus } from './entities/ticket.entity';
import { CustomersService, DEFAULT_DEMO_CUSTOMER_ID } from '../customers/customers.service';
import { Customer } from '../customers/entities/customer.entity';
import { UserRole } from '../auth/entities/user.entity';
import { AiAnalysisService } from '../ai/ai-analysis.service';
import {
  TICKET_PROCESSING_QUEUE,
  ANALYZE_AND_ASSIGN_JOB,
} from './ticket.processor';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketRepository: jest.Mocked<Repository<Ticket>>;
  let customersService: jest.Mocked<CustomersService>;
  let dataSource: jest.Mocked<DataSource>;
  let aiAnalysisService: {
    analyzeTicketById: jest.Mock;
    analyzeTicket: jest.Mock;
  };
  let ticketQueue: { add: jest.Mock };

  const mockCustomer: Customer = {
    id: DEFAULT_DEMO_CUSTOMER_ID,
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+1-555-0199',
    createdAt: new Date(),
    tickets: [],
  };

  beforeEach(async () => {
    const mockTicketRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((ticket) =>
        Promise.resolve({
          id: 'test-uuid-ticket-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...ticket,
        }),
      ),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    const mockCustomersSvc = {
      findById: jest.fn(),
      getDefaultCustomer: jest.fn().mockResolvedValue(mockCustomer),
    };

    const mockDataSource = {
      query: jest.fn().mockResolvedValue([{ next_val: '1001' }]),
    };

    const mockAiAnalysisSvc = {
      analyzeTicketById: jest.fn().mockResolvedValue(null),
      analyzeTicket: jest.fn().mockResolvedValue(null),
    };

    const mockTicketQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepo,
        },
        {
          provide: CustomersService,
          useValue: mockCustomersSvc,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AiAnalysisService,
          useValue: mockAiAnalysisSvc,
        },
        {
          provide: getQueueToken(TICKET_PROCESSING_QUEUE),
          useValue: mockTicketQueue,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    ticketRepository = module.get(getRepositoryToken(Ticket));
    customersService = module.get(CustomersService);
    dataSource = module.get(DataSource);
    aiAnalysisService = module.get(AiAnalysisService);
    ticketQueue = module.get(getQueueToken(TICKET_PROCESSING_QUEUE));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a bare ticket immediately and enqueue background processing job', async () => {
      customersService.findById.mockResolvedValue(mockCustomer);

      const dto = {
        subject: 'Fiber optical signal loss',
        description: 'LOS light blinking red since morning',
        customerId: mockCustomer.id,
      };

      const result = await service.create(dto, {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'ali@example.com',
        name: 'Ali Ahmed',
        role: UserRole.CUSTOMER,
        customerId: mockCustomer.id,
      });

      expect(customersService.findById).toHaveBeenCalledWith(mockCustomer.id);
      expect(dataSource.query).toHaveBeenCalledWith("SELECT nextval('ticket_number_seq') AS next_val;");
      expect(ticketRepository.create).toHaveBeenCalledWith({
        subject: dto.subject,
        description: dto.description,
        status: TicketStatus.OPEN,
        priority: TicketPriority.MEDIUM,
        customerId: mockCustomer.id,
        ticketNumber: 'TIC-1001',
        assignedTeamId: null,
        assignedAgentId: null,
      });
      expect(ticketRepository.save).toHaveBeenCalled();

      // Verify job enqueued to BullMQ
      expect(ticketQueue.add).toHaveBeenCalledWith(
        ANALYZE_AND_ASSIGN_JOB,
        {
          ticketId: 'test-uuid-ticket-1',
          subject: dto.subject,
          description: dto.description,
        },
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        }),
      );

      expect(result.status).toBe(TicketStatus.OPEN);
      expect(result.priority).toBe(TicketPriority.MEDIUM);
      expect(result.ticketNumber).toBe('TIC-1001');
      expect(result.subject).toBe(dto.subject);
      expect(result.assignedTeamId).toBeNull();
      expect(result.assignedAgentId).toBeNull();
    });

    it('should use the authenticated customer when customerId is omitted', async () => {
      customersService.findById.mockResolvedValue(mockCustomer);

      const dto = {
        subject: 'Slow bandwidth in Sector 4',
        description: 'Speedtest shows 5 Mbps instead of 100 Mbps',
      };

      const result = await service.create(dto, {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'ali@example.com',
        name: 'Ali Ahmed',
        role: UserRole.CUSTOMER,
        customerId: mockCustomer.id,
      });

      expect(customersService.findById).toHaveBeenCalledWith(mockCustomer.id);
      expect(result.customerId).toBe(DEFAULT_DEMO_CUSTOMER_ID);
      expect(result.ticketNumber).toBe('TIC-1001');
    });

    it('should reject a customer attempting to submit for another customer', async () => {
      const dto = {
        subject: 'Router malfunction',
        description: 'Power LED off',
        customerId: '99999999-9999-4999-8999-999999999999',
      };

      await expect(
        service.create(dto, {
          id: '22222222-2222-4222-8222-222222222222',
          email: 'ali@example.com',
          name: 'Ali Ahmed',
          role: UserRole.CUSTOMER,
          customerId: mockCustomer.id,
        }),
      ).rejects.toThrow('own account');
      expect(ticketRepository.save).not.toHaveBeenCalled();
      expect(ticketQueue.add).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if specified non-default customer does not exist', async () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999';
      customersService.findById.mockRejectedValue(new NotFoundException());

      const dto = {
        subject: 'Router malfunction',
        description: 'Power LED off',
        customerId: nonExistentId,
      };

      await expect(
        service.create(dto, {
          id: '33333333-3333-4333-8333-333333333333',
          email: 'haris@example.com',
          name: 'Haris',
          role: UserRole.AGENT,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(ticketRepository.save).not.toHaveBeenCalled();
      expect(ticketQueue.add).not.toHaveBeenCalled();
    });

    it('should still succeed creating ticket if queue dispatch fails', async () => {
      customersService.findById.mockResolvedValue(mockCustomer);
      ticketQueue.add.mockRejectedValue(new Error('Redis connection down'));

      const dto = {
        subject: 'Billing discrepancy',
        description: 'Overcharged this month',
      };

      const result = await service.create(dto, {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'ali@example.com',
        name: 'Ali Ahmed',
        role: UserRole.CUSTOMER,
        customerId: mockCustomer.id,
      });

      expect(ticketRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('test-uuid-ticket-1');
    });
  });

  describe('updateStatus', () => {
    const teamId = 'team-netops-id';
    const agentId = 'agent-1-id';
    const otherAgentId = 'agent-2-id';
    const otherTeamId = 'team-billing-id';

    const testTicket = {
      id: 'ticket-1',
      ticketNumber: 'TIC-1001',
      subject: 'Fiber line damage',
      description: 'LOS red',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      customerId: 'cust-1',
      assignedTeamId: teamId,
      assignedAgentId: agentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: {} as any,
    } as Ticket;

    it('allows agent to update status of their own ticket', async () => {
      ticketRepository.findOne.mockResolvedValue({ ...testTicket });

      const updated = await service.updateStatus('ticket-1', TicketStatus.IN_PROGRESS, {
        id: agentId,
        email: 'agent1@example.com',
        name: 'Agent One',
        role: UserRole.AGENT,
        supportTeamId: teamId,
      });

      expect(ticketRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TicketStatus.IN_PROGRESS }),
      );
    });

    it('rejects agent updating status of a teammate ticket within same team (403)', async () => {
      ticketRepository.findOne.mockResolvedValue({ ...testTicket });

      await expect(
        service.updateStatus('ticket-1', TicketStatus.RESOLVED, {
          id: otherAgentId, // Teammate, not owner
          email: 'agent2@example.com',
          name: 'Agent Two',
          role: UserRole.AGENT,
          supportTeamId: teamId,
        }),
      ).rejects.toThrow('You can only update status of tickets assigned to you');
    });

    it('rejects agent updating status of a ticket assigned to another team (403)', async () => {
      ticketRepository.findOne.mockResolvedValue({ ...testTicket });

      await expect(
        service.updateStatus('ticket-1', TicketStatus.RESOLVED, {
          id: 'agent-other-team',
          email: 'other@example.com',
          name: 'Other Agent',
          role: UserRole.AGENT,
          supportTeamId: otherTeamId, // Different team
        }),
      ).rejects.toThrow('You do not have access to this ticket');
    });

    it('allows admin to update status of any ticket', async () => {
      ticketRepository.findOne.mockResolvedValue({ ...testTicket });

      const updated = await service.updateStatus('ticket-1', TicketStatus.RESOLVED, {
        id: 'admin-id',
        email: 'admin@example.com',
        name: 'Admin User',
        role: UserRole.ADMIN,
      });

      expect(ticketRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TicketStatus.RESOLVED }),
      );
    });
  });

  describe('triggerAnalysis', () => {
    const teamId = 'team-netops-id';
    const otherTeamId = 'team-billing-id';

    const testTicket = {
      id: 'ticket-1',
      ticketNumber: 'TIC-1001',
      subject: 'Fiber line damage',
      description: 'LOS red',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      customerId: 'cust-1',
      assignedTeamId: teamId,
      assignedAgentId: 'agent-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: {} as any,
    } as Ticket;

    it('allows agent to trigger analysis for a ticket in their team', async () => {
      ticketRepository.findOne.mockResolvedValue(testTicket);

      await service.triggerAnalysis('ticket-1', {
        id: 'agent-1',
        email: 'agent1@example.com',
        name: 'Agent One',
        role: UserRole.AGENT,
        supportTeamId: teamId,
      });

      expect(aiAnalysisService.analyzeTicket).toHaveBeenCalledWith(testTicket);
    });

    it('rejects agent triggering analysis for a ticket in another team (403)', async () => {
      ticketRepository.findOne.mockResolvedValue(testTicket);

      await expect(
        service.triggerAnalysis('ticket-1', {
          id: 'agent-2',
          email: 'agent2@example.com',
          name: 'Agent Two',
          role: UserRole.AGENT,
          supportTeamId: otherTeamId,
        }),
      ).rejects.toThrow('You do not have access to this ticket');
    });
  });

  describe('findById', () => {
    it('returns ticket with customer, assignedTeam, and assignedAgent without password', async () => {
      const mockTicket = {
        id: 'ticket-1',
        ticketNumber: 'TIC-1001',
        subject: 'Fiber line damage',
        description: 'LOS red',
        status: TicketStatus.OPEN,
        priority: TicketPriority.HIGH,
        customerId: mockCustomer.id,
        assignedTeamId: 'team-1',
        assignedTeam: { id: 'team-1', name: 'Technical Support', code: 'TECHNICAL_SUPPORT' },
        assignedAgentId: 'agent-1',
        assignedAgent: { id: 'agent-1', name: 'Ahmed Agent', email: 'ahmed@isp.com', password: 'hashed-secret' },
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: mockCustomer,
      } as any;

      ticketRepository.findOne.mockResolvedValue(mockTicket);

      const result = await service.findById('ticket-1', {
        id: 'cust-id',
        email: mockCustomer.email,
        name: mockCustomer.name,
        role: UserRole.CUSTOMER,
        customerId: mockCustomer.id,
      });

      expect(ticketRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        relations: ['customer', 'assignedTeam', 'assignedAgent'],
      });
      expect(result.assignedTeam?.name).toBe('Technical Support');
      expect(result.assignedAgent?.name).toBe('Ahmed Agent');
      expect((result.assignedAgent as any).password).toBeUndefined();
    });
  });
});

