import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { SupportTeam } from '../../teams/entities/support-team.entity';

export const DEFAULT_TIER_1_TEAM_ID = '44444444-4444-4444-4444-444444444444';
export const NETWORK_OPERATIONS_TEAM_ID = '55555555-5555-4555-8555-555555555555';
export const TECHNICAL_SUPPORT_TEAM_ID = '66666666-6666-4666-8666-666666666666';
export const BILLING_TEAM_ID = '77777777-7777-4777-8777-777777777777';
export const INSTALLATION_TEAM_ID = '88888888-8888-4888-8888-888888888888';

export default class TeamsSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(SupportTeam);

    // Idempotent upsert by 'code' conflict target
    await repo.upsert(
      [
        {
          id: DEFAULT_TIER_1_TEAM_ID,
          name: 'Tier 1 Support',
          code: 'TIER_1',
        },
        {
          id: NETWORK_OPERATIONS_TEAM_ID,
          name: 'Network Operations',
          code: 'NETWORK_OPERATIONS',
        },
        {
          id: TECHNICAL_SUPPORT_TEAM_ID,
          name: 'Technical Support',
          code: 'TECHNICAL_SUPPORT',
        },
        {
          id: BILLING_TEAM_ID,
          name: 'Billing',
          code: 'BILLING',
        },
        {
          id: INSTALLATION_TEAM_ID,
          name: 'Installation',
          code: 'INSTALLATION',
        },
      ],
      ['code'],
    );
  }
}

