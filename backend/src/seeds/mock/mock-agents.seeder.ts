import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../auth/entities/user.entity';
import {
  NETWORK_OPERATIONS_TEAM_ID,
  TECHNICAL_SUPPORT_TEAM_ID,
  BILLING_TEAM_ID,
  INSTALLATION_TEAM_ID,
} from '../baseline/teams.seeder';

export default class MockAgentsSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(User);

    // Standard mock agent password hash (agent123)
    const agentPasswordHash = '$2a$10$V.tjhj8HvYZosz3BglIE.Oih1Hz9KLzoo2Q4kVfFBmLMQalMPMjdq';

    // Idempotent upsert by 'email'
    await repo.upsert(
      [
        {
          id: '33333333-3333-4333-8333-333333333334',
          email: 'tariq.net@example.com',
          password: agentPasswordHash,
          name: 'Tariq Network',
          role: UserRole.AGENT,
          customerId: null,
          supportTeamId: NETWORK_OPERATIONS_TEAM_ID,
        },
        {
          id: '33333333-3333-4333-8333-333333333335',
          email: 'bilal.tech@example.com',
          password: agentPasswordHash,
          name: 'Bilal Tech',
          role: UserRole.AGENT,
          customerId: null,
          supportTeamId: TECHNICAL_SUPPORT_TEAM_ID,
        },
        {
          id: '33333333-3333-4333-8333-333333333336',
          email: 'sara.billing@example.com',
          password: agentPasswordHash,
          name: 'Sara Billing',
          role: UserRole.AGENT,
          customerId: null,
          supportTeamId: BILLING_TEAM_ID,
        },
        {
          id: '33333333-3333-4333-8333-333333333337',
          email: 'usman.install@example.com',
          password: agentPasswordHash,
          name: 'Usman Field',
          role: UserRole.AGENT,
          customerId: null,
          supportTeamId: INSTALLATION_TEAM_ID,
        },
      ],
      ['email'],
    );
  }
}

