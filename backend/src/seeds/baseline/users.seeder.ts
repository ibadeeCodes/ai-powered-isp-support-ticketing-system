import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../auth/entities/user.entity';
import { JANE_DOE_CUSTOMER_ID } from './customers.seeder';
import { DEFAULT_TIER_1_TEAM_ID } from './teams.seeder';

export default class UsersSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(User);

    // Passwords hashed with bcrypt (customer123 and agent123)
    const customerPasswordHash = '$2a$10$ypDzqQ/oZI884Ytl4.HLRewi25FZijN07DIEUT0t1kbNwuoAHdlwC';
    const agentPasswordHash = '$2a$10$V.tjhj8HvYZosz3BglIE.Oih1Hz9KLzoo2Q4kVfFBmLMQalMPMjdq';

    // Idempotent upsert by 'email' conflict target
    await repo.upsert(
      [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: 'ali@example.com',
          password: customerPasswordHash,
          name: 'Ali Ahmed',
          role: UserRole.CUSTOMER,
          customerId: JANE_DOE_CUSTOMER_ID,
          supportTeamId: null,
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          email: 'haris@example.com',
          password: agentPasswordHash,
          name: 'Haris',
          role: UserRole.AGENT,
          customerId: null,
          supportTeamId: DEFAULT_TIER_1_TEAM_ID,
        },
      ],
      ['email'],
    );
  }
}

