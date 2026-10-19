/**
 * Production One-Time Release Script (Version 1.1)
 *
 * Backfills legacy OPEN tickets with no assigned team/agent:
 *   - Target: tickets WHERE assigned_team_id IS NULL AND status = 'OPEN'
 *   - Assigned Team: Technical Support (66666666-6666-4666-8666-666666666666)
 *   - Assigned Agent: Bilal Tech (33333333-3333-4333-8333-333333333335)
 *
 * Execution:
 *   npx ts-node -r tsconfig-paths/register src/scripts/release/v1.1-backfill-legacy-open-tickets.ts
 */
import { AppDataSource } from '../../data-source';
import { SupportTeam } from '../../teams/entities/support-team.entity';
import { User, UserRole } from '../../auth/entities/user.entity';
import { Ticket, TicketStatus } from '../../tickets/entities/ticket.entity';

const TECHNICAL_SUPPORT_TEAM_ID = '66666666-6666-4666-8666-666666666666';
const TARGET_AGENT_ID = '33333333-3333-4333-8333-333333333335';

async function backfillLegacyOpenTickets() {
  console.log('🚀 Running Production Release Script: Backfill Legacy OPEN Tickets');
  await AppDataSource.initialize();

  const teamRepo = AppDataSource.getRepository(SupportTeam);
  const userRepo = AppDataSource.getRepository(User);
  const ticketRepo = AppDataSource.getRepository(Ticket);

  // 1. Safety Check: Verify Target Team exists
  const team = await teamRepo.findOne({ where: { id: TECHNICAL_SUPPORT_TEAM_ID } });
  if (!team) {
    throw new Error(
      `Safety Check Failed: SupportTeam with id "${TECHNICAL_SUPPORT_TEAM_ID}" does not exist in the database!`,
    );
  }
  console.log(`  ✓ Verified Team: ${team.name} (${team.code})`);

  // 2. Safety Check: Verify Target Agent exists and belongs to this team
  const agent = await userRepo.findOne({ where: { id: TARGET_AGENT_ID } });
  if (!agent) {
    throw new Error(
      `Safety Check Failed: Agent with id "${TARGET_AGENT_ID}" does not exist in the database!`,
    );
  }
  if (agent.role !== UserRole.AGENT) {
    throw new Error(
      `Safety Check Failed: User "${agent.email}" has role "${agent.role}", expected "${UserRole.AGENT}"!`,
    );
  }
  if (agent.supportTeamId !== TECHNICAL_SUPPORT_TEAM_ID) {
    throw new Error(
      `Safety Check Failed: Agent "${agent.name}" is assigned to team "${agent.supportTeamId}", not Technical Support!`,
    );
  }
  console.log(`  ✓ Verified Agent: ${agent.name} (${agent.email})`);

  // 3. Count unassigned legacy OPEN tickets before update
  const unassignedCount = await ticketRepo
    .createQueryBuilder('ticket')
    .where('ticket.assigned_team_id IS NULL')
    .andWhere('ticket.status = :status', { status: TicketStatus.OPEN })
    .getCount();

  console.log(`  ℹ Found ${unassignedCount} legacy OPEN ticket(s) with no assigned team.`);

  if (unassignedCount === 0) {
    console.log('  ✨ No legacy unassigned tickets found. Nothing to update.');
    await AppDataSource.destroy();
    return;
  }

  // 4. Perform idempotent backfill update
  console.log(`  → Assigning tickets to Team: "${team.name}" and Agent: "${agent.name}"...`);
  const updateResult = await ticketRepo
    .createQueryBuilder()
    .update(Ticket)
    .set({
      assignedTeamId: TECHNICAL_SUPPORT_TEAM_ID,
      assignedAgentId: TARGET_AGENT_ID,
    })
    .where('assigned_team_id IS NULL')
    .andWhere('status = :status', { status: TicketStatus.OPEN })
    .execute();

  console.log(`  ✅ Successfully backfilled ${updateResult.affected ?? 0} legacy ticket(s)!`);
  console.log('🎉 Script execution finished successfully.');

  await AppDataSource.destroy();
}

backfillLegacyOpenTickets().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});