import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { TicketProcessor, ANALYZE_AND_ASSIGN_JOB, TicketAnalysisJobData } from './ticket.processor';
import { Ticket } from './entities/ticket.entity';
import { SupportTeam } from '../teams/entities/support-team.entity';
import { AiAnalysisService } from '../ai/ai-analysis.service';
import { TicketAssignmentService } from '../teams/ticket-assignment.service';
import { User, UserRole } from '../auth/entities/user.entity';
import { AiAnalysis } from '../ai/entities/ai-analysis.entity';

describe('TicketProcessor', () => {
  let processor: TicketProcessor;
  let ticketRepository: jest.Mocked<Repository<Ticket>>;
  let supportTeamRepository: jest.Mocked<Repository<SupportTeam>>;
  let aiAnalysisService: {
    runAnalysis: jest.Mock;
    persistExecutionResult: jest.Mock;
    getLatestCompletedAnalysis: jest.Mock;
  };
  let ticketAssignmentService: { selectAgentForTeam: jest.Mock };

  const mockTechSupportTeam = {
    id: 'team-tech-support-uuid',
    name: 'Technical Support',
    code: 'TECHNICAL_SUPPORT',
  } as SupportTeam;

  const mockNetworkOpsTeam = {
    id: 'team-net-ops-uuid',
    name: 'Network Operations',
    code: 'NETWORK_OPERATIONS',
  } as SupportTeam;

  const mockAgent = {
    id: 'agent-1-uuid',
    name: 'Bilal Khan',
    role: UserRole.AGENT,
    supportTeamId: mockTechSupportTeam.id,
  } as User;

  beforeEach(async () => {
    const mockTicketRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const mockSupportTeamRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where?.code === 'NETWORK_OPERATIONS') {
          return Promise.resolve(mockNetworkOpsTeam);
        }
        if (where?.code === 'TECHNICAL_SUPPORT') {
          return Promise.resolve(mockTechSupportTeam);
        }
        return Promise.resolve(null);
      }),
    };

    const mockAiAnalysisSvc = {
      runAnalysis: jest.fn(),
      persistExecutionResult: jest.fn().mockResolvedValue(null),
      getLatestCompletedAnalysis: jest.fn().mockResolvedValue(null),
    };

    const mockTicketAssignmentSvc = {
      selectAgentForTeam: jest.fn().mockResolvedValue(mockAgent),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketProcessor,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepo,
        },
        {
          provide: getRepositoryToken(SupportTeam),
          useValue: mockSupportTeamRepo,
        },
        {
          provide: AiAnalysisService,
          useValue: mockAiAnalysisSvc,
        },
        {
          provide: TicketAssignmentService,
          useValue: mockTicketAssignmentSvc,
        },
      ],
    }).compile();

    processor = module.get<TicketProcessor>(TicketProcessor);
    ticketRepository = module.get(getRepositoryToken(Ticket));
    supportTeamRepository = module.get(getRepositoryToken(SupportTeam));
    aiAnalysisService = module.get(AiAnalysisService);
    ticketAssignmentService = module.get(TicketAssignmentService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process first attempt: run AI analysis, persist it, resolve team, assign agent and update ticket', async () => {
    aiAnalysisService.getLatestCompletedAnalysis.mockResolvedValue(null);

    const aiResult = {
      validated: {
        suggestedTeam: 'NETWORK_OPERATIONS',
      },
    };
    aiAnalysisService.runAnalysis.mockResolvedValue(aiResult);

    const netOpsAgent = {
      id: 'netops-agent-uuid',
      name: 'Ahmed NetOps',
      role: UserRole.AGENT,
      supportTeamId: mockNetworkOpsTeam.id,
    } as User;
    ticketAssignmentService.selectAgentForTeam.mockResolvedValue(netOpsAgent);

    const mockJob = {
      id: 'job-1',
      name: ANALYZE_AND_ASSIGN_JOB,
      attemptsMade: 0,
      data: {
        ticketId: 'test-ticket-id',
        subject: 'Fiber line cut',
        description: 'Physical cable damaged',
      },
    } as Job<TicketAnalysisJobData>;

    await processor.process(mockJob);

    expect(aiAnalysisService.getLatestCompletedAnalysis).toHaveBeenCalledWith('test-ticket-id');
    expect(aiAnalysisService.runAnalysis).toHaveBeenCalledWith('Fiber line cut', 'Physical cable damaged');
    expect(aiAnalysisService.persistExecutionResult).toHaveBeenCalledWith('test-ticket-id', aiResult);
    expect(supportTeamRepository.findOne).toHaveBeenCalledWith({ where: { code: 'NETWORK_OPERATIONS' } });
    expect(ticketAssignmentService.selectAgentForTeam).toHaveBeenCalledWith(mockNetworkOpsTeam);
    expect(ticketRepository.update).toHaveBeenCalledWith('test-ticket-id', {
      assignedTeamId: mockNetworkOpsTeam.id,
      assignedAgentId: netOpsAgent.id,
    });
  });

  it('should skip Gemini call on retry if AI analysis already exists (idempotency check)', async () => {
    const existingAnalysis = {
      id: 'analysis-1',
      ticketId: 'test-ticket-id',
      suggestedTeam: 'NETWORK_OPERATIONS',
    } as AiAnalysis;
    aiAnalysisService.getLatestCompletedAnalysis.mockResolvedValue(existingAnalysis);

    const mockJob = {
      id: 'job-1',
      name: ANALYZE_AND_ASSIGN_JOB,
      attemptsMade: 1, // Second attempt (retry)
      data: {
        ticketId: 'test-ticket-id',
        subject: 'Fiber line cut',
        description: 'Physical cable damaged',
      },
    } as Job<TicketAnalysisJobData>;

    await processor.process(mockJob);

    expect(aiAnalysisService.getLatestCompletedAnalysis).toHaveBeenCalledWith('test-ticket-id');
    // Gemini must NOT be called again on retry
    expect(aiAnalysisService.runAnalysis).not.toHaveBeenCalled();
    expect(aiAnalysisService.persistExecutionResult).not.toHaveBeenCalled();

    // Downstream assignment continues with cached suggestedTeam
    expect(supportTeamRepository.findOne).toHaveBeenCalledWith({ where: { code: 'NETWORK_OPERATIONS' } });
    expect(ticketRepository.update).toHaveBeenCalled();
  });

  it('should fallback to TECHNICAL_SUPPORT team if AI suggested team is unknown', async () => {
    aiAnalysisService.getLatestCompletedAnalysis.mockResolvedValue(null);
    aiAnalysisService.runAnalysis.mockResolvedValue({
      validated: {
        suggestedTeam: 'UNKNOWN_TEAM',
      },
    });

    const mockJob = {
      id: 'job-2',
      name: ANALYZE_AND_ASSIGN_JOB,
      attemptsMade: 0,
      data: {
        ticketId: 'test-ticket-id-2',
        subject: 'General enquiry',
        description: 'Help needed',
      },
    } as Job<TicketAnalysisJobData>;

    await processor.process(mockJob);

    expect(supportTeamRepository.findOne).toHaveBeenCalledWith({ where: { code: 'UNKNOWN_TEAM' } });
    expect(supportTeamRepository.findOne).toHaveBeenCalledWith({ where: { code: 'TECHNICAL_SUPPORT' } });
    expect(ticketRepository.update).toHaveBeenCalledWith('test-ticket-id-2', {
      assignedTeamId: mockTechSupportTeam.id,
      assignedAgentId: mockAgent.id,
    });
  });

  it('should set assignedAgentId to null if no eligible agent exists', async () => {
    aiAnalysisService.getLatestCompletedAnalysis.mockResolvedValue(null);
    aiAnalysisService.runAnalysis.mockResolvedValue({
      validated: {
        suggestedTeam: 'NETWORK_OPERATIONS',
      },
    });
    ticketAssignmentService.selectAgentForTeam.mockResolvedValue(null);

    const mockJob = {
      id: 'job-3',
      name: ANALYZE_AND_ASSIGN_JOB,
      attemptsMade: 0,
      data: {
        ticketId: 'test-ticket-id-3',
        subject: 'Line fault',
        description: 'No agents available',
      },
    } as Job<TicketAnalysisJobData>;

    await processor.process(mockJob);

    expect(ticketRepository.update).toHaveBeenCalledWith('test-ticket-id-3', {
      assignedTeamId: mockNetworkOpsTeam.id,
      assignedAgentId: null,
    });
  });

  it('should re-throw error so BullMQ registers failure and schedules retry when update fails', async () => {
    aiAnalysisService.getLatestCompletedAnalysis.mockResolvedValue(null);
    aiAnalysisService.runAnalysis.mockResolvedValue({
      validated: {
        suggestedTeam: 'TECHNICAL_SUPPORT',
      },
    });
    ticketRepository.update.mockRejectedValue(new Error('Postgres connection dead'));

    const mockJob = {
      id: 'job-4',
      name: ANALYZE_AND_ASSIGN_JOB,
      attemptsMade: 0,
      data: {
        ticketId: 'test-ticket-id-4',
        subject: 'Router offline',
        description: 'No power',
      },
    } as Job<TicketAnalysisJobData>;

    await expect(processor.process(mockJob)).rejects.toThrow('Postgres connection dead');
  });
});
