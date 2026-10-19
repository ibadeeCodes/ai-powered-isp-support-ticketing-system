import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../auth/entities/user.entity';
import { SupportTeam } from './entities/support-team.entity';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';

/**
 * Dedicated ticket assignment service.
 *
 * Domain Responsibility:
 * Given a SupportTeam:
 *   1. Find eligible AGENT users belonging to that team (role = AGENT, support_team_id = team.id).
 *   2. Calculate each agent's active ticket workload (count of tickets with status OPEN or IN_PROGRESS).
 *   3. Select the agent with the lowest workload (tie-breaker: agent.id ASC).
 *   4. Return the selected User, or null if no eligible agents exist in the team.
 *
 * Out of Scope:
 * - Ticket creation or modification
 * - AI analysis or team determination
 * - Reassignment, supervisor, or availability logic
 */
@Injectable()
export class TicketAssignmentService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Selects the least-loaded eligible agent for the specified SupportTeam.
   * Returns null if no eligible AGENT users belong to the team.
   */
  async selectAgentForTeam(team: SupportTeam | { id: string }): Promise<User | null> {
    const teamId = team.id;

    // Single efficient query to find eligible agents and their active ticket workload
    const result = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin(
        Ticket,
        'ticket',
        'ticket.assigned_agent_id = user.id AND ticket.status IN (:...activeStatuses)',
        { activeStatuses: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
      )
      .where('user.role = :role', { role: UserRole.AGENT })
      .andWhere('user.support_team_id = :teamId', { teamId })
      .select('user.id', 'id')
      .addSelect('COUNT(ticket.id)', 'active_workload')
      .groupBy('user.id')
      .orderBy('COUNT(ticket.id)', 'ASC')
      .addOrderBy('user.id', 'ASC')
      .limit(1)
      .getRawOne<{ id: string; active_workload: string }>();

    if (!result) {
      return null;
    }

    return this.userRepository.findOne({ where: { id: result.id } });
  }
}
