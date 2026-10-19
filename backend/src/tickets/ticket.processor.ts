import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Ticket } from './entities/ticket.entity';
import { SupportTeam } from '../teams/entities/support-team.entity';
import { AiAnalysisService } from '../ai/ai-analysis.service';
import { TicketAssignmentService } from '../teams/ticket-assignment.service';
import { DEFAULT_SUPPORT_TEAM_CODE } from '../ai/ai.constants';

export const TICKET_PROCESSING_QUEUE = 'ticket-processing';
export const ANALYZE_AND_ASSIGN_JOB = 'analyze-and-assign';

export interface TicketAnalysisJobData {
  ticketId: string;
  subject: string;
  description: string;
}

@Processor(TICKET_PROCESSING_QUEUE)
export class TicketProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketProcessor.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(SupportTeam)
    private readonly supportTeamRepository: Repository<SupportTeam>,
    private readonly aiAnalysisService: AiAnalysisService,
    private readonly ticketAssignmentService: TicketAssignmentService,
  ) {
    super();
  }

  async process(job: Job<TicketAnalysisJobData>): Promise<void> {
    if (job.name !== ANALYZE_AND_ASSIGN_JOB) {
      return;
    }

    const { ticketId, subject, description } = job.data;
    this.logger.log(`Processing background analysis and assignment for ticket ${ticketId} (attempt ${job.attemptsMade + 1})`);

    try {
      // 1. Idempotency Check: Did a previous attempt already run and persist AI analysis?
      const existingAnalysis = await this.aiAnalysisService.getLatestCompletedAnalysis(ticketId);
      let suggestedTeam: string | null = null;

      if (existingAnalysis) {
        this.logger.log(
          `Ticket ${ticketId} already has completed AI analysis from attempt ${job.attemptsMade}. Reusing analysis without calling Gemini API.`,
        );
        suggestedTeam = existingAnalysis.suggestedTeam;
      } else {
        // Run AI analysis
        const aiResult = await this.aiAnalysisService.runAnalysis(subject, description);
        suggestedTeam = aiResult?.validated?.suggestedTeam ?? null;

        // Persist AI analysis immediately so downstream retry does not re-run Gemini
        await this.aiAnalysisService.persistExecutionResult(ticketId, aiResult);
      }

      // 2. Resolve SupportTeam (suggested team, or fallback to default)
      const team = await this.resolveSupportTeam(suggestedTeam);

      // 3. Determine least-loaded eligible agent for the team
      const assignedAgent = team
        ? await this.ticketAssignmentService.selectAgentForTeam(team)
        : null;

      // 4. Update the ticket in the database with assigned team and agent
      await this.ticketRepository.update(ticketId, {
        assignedTeamId: team ? team.id : null,
        assignedAgentId: assignedAgent ? assignedAgent.id : null,
      });

      this.logger.log(
        `Ticket ${ticketId} successfully assigned to team "${team?.code ?? 'NONE'}" and agent "${
          assignedAgent?.id ?? 'UNASSIGNED'
        }"`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(
        `Error processing background job ${job.id} for ticket ${ticketId}: ${message}. Re-throwing for BullMQ retry.`,
      );
      // Re-throw so BullMQ registers the failure and schedules the retry
      throw error;
    }
  }

  private async resolveSupportTeam(
    suggestedTeam?: string | null,
  ): Promise<SupportTeam | null> {
    if (suggestedTeam) {
      const team = await this.supportTeamRepository.findOne({
        where: { code: suggestedTeam },
      });
      if (team) {
        return team;
      }
      this.logger.warn(
        `AI suggested team "${suggestedTeam}" could not be resolved. Falling back to default "${DEFAULT_SUPPORT_TEAM_CODE}".`,
      );
    }

    return this.supportTeamRepository.findOne({
      where: { code: DEFAULT_SUPPORT_TEAM_CODE },
    });
  }
}
