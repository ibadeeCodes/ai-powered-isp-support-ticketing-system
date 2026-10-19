/**
 * Production One-Time Release Script (Version 1.0)
 *
 * Handles essential baseline system data setup AND backfilling/mapping
 * any existing Production agents to Tier 1 Support.
 *
 * Execution (Deploy Pipeline):
 *   npx ts-node -r tsconfig-paths/register src/scripts/release/v1.0-essential-and-backfill-data.ts
 */
import { AppDataSource } from '../../data-source';
import { SupportTeam } from '../../teams/entities/support-team.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User, UserRole } from '../../auth/entities/user.entity';

const TIER_1_TEAM_ID = '44444444-4444-4444-4444-444444444444';
const JANE_DOE_CUSTOMER_ID = '11111111-1111-1111-1111-111111111111';

async function runReleaseScript() {
  console.log('🚀 Running Production Release Script: v1.0-essential-and-backfill-data.ts');
  await AppDataSource.initialize();

  const teamRepo = AppDataSource.getRepository(SupportTeam);
  const customerRepo = AppDataSource.getRepository(Customer);
  const userRepo = AppDataSource.getRepository(User);

  // 1. Essential Baseline Support Teams
  console.log('  → Setting up Support Teams...');
  await teamRepo.upsert(
    [
      { id: TIER_1_TEAM_ID, name: 'Tier 1 Support', code: 'TIER_1' },
      { id: '55555555-5555-4555-8555-555555555555', name: 'Network Operations', code: 'NETWORK_OPERATIONS' },
      { id: '66666666-6666-4666-8666-666666666666', name: 'Technical Support', code: 'TECHNICAL_SUPPORT' },
      { id: '77777777-7777-4777-8777-777777777777', name: 'Billing', code: 'BILLING' },
      { id: '88888888-8888-4888-8888-888888888888', name: 'Installation', code: 'INSTALLATION' },
    ],
    ['code'],
  );

  // 2. Essential Baseline Customer & Users
  console.log('  → Setting up Baseline Customer & Users...');
  await customerRepo.upsert(
    [{ id: JANE_DOE_CUSTOMER_ID, name: 'Jane Doe', email: 'jane.doe@example.com', phone: '+1-555-0199' }],
    ['email'],
  );

  const customerPasswordHash = '$2a$10$ypDzqQ/oZI884Ytl4.HLRewi25FZijN07DIEUT0t1kbNwuoAHdlwC';
  const agentPasswordHash = '$2a$10$V.tjhj8HvYZosz3BglIE.Oih1Hz9KLzoo2Q4kVfFBmLMQalMPMjdq';

  await userRepo.upsert(
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
        supportTeamId: TIER_1_TEAM_ID,
      },
    ],
    ['email'],
  );

  // 3. Backfill / Safety Fallback: Assign any pre-existing unmapped Production agents to Tier 1 Support
  console.log('  → Backfilling unassigned Production agents to Tier 1 Support...');
  const updateResult = await userRepo
    .createQueryBuilder()
    .update(User)
    .set({ supportTeamId: TIER_1_TEAM_ID })
    .where('role = :role AND supportTeamId IS NULL', { role: UserRole.AGENT })
    .execute();

  console.log(`  → Unassigned agents backfilled: ${updateResult.affected ?? 0}`);
  console.log('✅ Release script execution complete!');

  await AppDataSource.destroy();
}

runReleaseScript().catch((err) => {
  console.error('❌ Release script failed:', err);
  process.exit(1);
});
