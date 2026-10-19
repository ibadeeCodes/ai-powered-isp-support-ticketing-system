import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketAssignmentService } from './ticket-assignment.service';
import { User, UserRole } from '../auth/entities/user.entity';
import { SupportTeam } from './entities/support-team.entity';

describe('TicketAssignmentService', () => {
  let service: TicketAssignmentService;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockTeam: SupportTeam = {
    id: 'team-net-ops-uuid',
    name: 'Network Operations',
    code: 'NETWORK_OPERATIONS',
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
    tickets: [],
  };

  const mockAgent1 = { id: 'agent-1-uuid', name: 'Agent Ahmed', role: UserRole.AGENT, supportTeamId: mockTeam.id } as User;
  const mockAgent2 = { id: 'agent-2-uuid', name: 'Agent Bilal', role: UserRole.AGENT, supportTeamId: mockTeam.id } as User;

  let queryBuilderMock: any;

  beforeEach(async () => {
    queryBuilderMock = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketAssignmentService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TicketAssignmentService>(TicketAssignmentService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should select agent with lowest active workload', async () => {
    queryBuilderMock.getRawOne.mockResolvedValue({ id: 'agent-2-uuid', active_workload: '1' });
    userRepository.findOne.mockResolvedValue(mockAgent2);

    const result = await service.selectAgentForTeam(mockTeam);

    expect(result).toEqual(mockAgent2);
    expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(queryBuilderMock.where).toHaveBeenCalledWith('user.role = :role', { role: UserRole.AGENT });
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('user.support_team_id = :teamId', { teamId: mockTeam.id });
    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'agent-2-uuid' } });
  });

  it('should return null when team has no eligible agents', async () => {
    queryBuilderMock.getRawOne.mockResolvedValue(undefined);

    const result = await service.selectAgentForTeam(mockTeam);

    expect(result).toBeNull();
    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('should break ties deterministically using agent.id ASC via queryBuilder ordering', async () => {
    queryBuilderMock.getRawOne.mockResolvedValue({ id: 'agent-1-uuid', active_workload: '2' });
    userRepository.findOne.mockResolvedValue(mockAgent1);

    const result = await service.selectAgentForTeam(mockTeam);

    expect(result).toEqual(mockAgent1);
    expect(queryBuilderMock.orderBy).toHaveBeenCalledWith('COUNT(ticket.id)', 'ASC');
    expect(queryBuilderMock.addOrderBy).toHaveBeenCalledWith('user.id', 'ASC');
  });
});
