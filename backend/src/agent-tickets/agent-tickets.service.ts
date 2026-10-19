import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Ticket, TicketPriority } from '../tickets/entities/ticket.entity';
import { AiAnalysis } from '../ai/entities/ai-analysis.entity';
import { AiAnalysisStatus, AiSentiment, AiSeverity } from '../ai/ai.constants';
import { PriorityService, PRIORITY_WEIGHTS, PRIORITY_BANDS, PriorityInput } from './priority.service';
import { AgentTicketQueryDto } from './dto/agent-ticket-query.dto';
import { AuthenticatedUser } from '../auth/auth.types';
import {
  AgentTicketsPageDto,
  AgentTicketItemDto,
  AgentTicketAiInsightDto,
} from './dto/agent-ticket-response.dto';
import {
  AgentTicketDetailDto,
  AgentTicketDetailAiDto,
  AgentTicketDetailCustomerDto,
} from './dto/agent-ticket-detail.dto';

/**
 * SQL CASE fragments for the operational priority score, generated from the
 * SAME PRIORITY_WEIGHTS the PriorityService uses — one source of truth, so
 * SQL ordering/filtering can never drift from the JS calculation.
 *
 * NOTE: All column references here are raw SQL names (e.g. a.requires_technician,
 * ticket.created_at) because this expression is embedded in getRawMany() queries
 * where alias 'a' is a raw table join, not a TypeORM entity alias.
 */
const SQL_PRIORITY_SCORE = [
  // Severity weight (AI severity; missing analysis → 0)
  `CASE a.severity`,
  ...Object.entries(PRIORITY_WEIGHTS.severity).map(
    ([value, weight]) => `WHEN '${value}' THEN ${weight}`,
  ),
  `ELSE 0 END`,
  // Technician requirement weight
  `+ CASE WHEN a.requires_technician = true THEN ${PRIORITY_WEIGHTS.technicianRequired} ELSE 0 END`,
  // Waiting-time weight from ticket.created_at (mirrors PriorityService buckets)
  `+ CASE`,
  `WHEN EXTRACT(EPOCH FROM (NOW() - ticket.created_at)) > ${PRIORITY_WEIGHTS.waitingTime.bucket2MaxSeconds} THEN ${PRIORITY_WEIGHTS.waitingTime.bucket3}`,
  `WHEN EXTRACT(EPOCH FROM (NOW() - ticket.created_at)) >= ${PRIORITY_WEIGHTS.waitingTime.bucket1MaxSeconds} THEN ${PRIORITY_WEIGHTS.waitingTime.bucket2}`,
  `ELSE ${PRIORITY_WEIGHTS.waitingTime.bucket1} END`,
  // Sentiment weight
  `+ CASE a.sentiment`,
  ...Object.entries(PRIORITY_WEIGHTS.sentiment).map(
    ([value, weight]) => `WHEN '${value}' THEN ${weight}`,
  ),
  `ELSE 0 END`,
].join(' ');

/** The JOIN condition used in both the row query and the count query. */
const AI_JOIN_CONDITION = `
  a.ticket_id = ticket.id
  AND a.status = :completed
  AND a.created_at = (
    SELECT MAX(a3.created_at) FROM ai_analyses a3
    WHERE a3.ticket_id = ticket.id AND a3.status = :completed
  )
`;

/** Lower bound of a priority band (from the shared PRIORITY_BANDS table). */
function bandMinScore(priority: string): number {
  const band = PRIORITY_BANDS.find((b) => b.priority === priority);
  return band ? band.minScore : 0;
}

/**
 * VS3 — Agent ticket queue use case.
 *
 * Uses a THREE-STEP approach to avoid TypeORM's `databaseName` crash:
 *
 * TypeORM's leftJoinAndMapOne / getRawAndEntities / getCount() all internally
 * call metadata resolution on every alias in the query. When a raw table string
 * ('ai_analyses') is used as a join target, the alias has no entity metadata,
 * so alias.metadata is undefined → crash on .primaryColumns[0].databaseName.
 *
 * Solution:
 *   Step 1 — getRawMany() with EXPLICIT selects only (ticket.id + priority score).
 *             Explicit selects prevent TypeORM from auto-expanding alias.* columns,
 *             so metadata is never resolved. Returns ordered, paginated ticket IDs.
 *   Step 2 — ticketRepository.findBy({ id: In([...]) }): proper entity query,
 *             no raw alias, full metadata, no crash.
 *   Step 3 — aiAnalysisRepository.createQueryBuilder(): proper entity alias,
 *             full metadata, no crash.
 *   Step 4 — Merge in application code and map to DTOs.
 */
@Injectable()
export class AgentTicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(AiAnalysis)
    private readonly aiAnalysisRepository: Repository<AiAnalysis>,
    private readonly priorityService: PriorityService,
  ) {}

  async getQueue(
    query: AgentTicketQueryDto,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<AgentTicketsPageDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Agent with no support team association has an empty queue
    if (!user.supportTeamId) {
      return {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 1 },
      };
    }

    const joinParams = { completed: AiAnalysisStatus.COMPLETED };

    // ── Step 1A: ordered, paginated ticket IDs + scores ─────────────────────
    // Explicit .select() + .addSelect() prevents TypeORM from auto-expanding
    // alias columns, so it never tries to read metadata for alias 'a'.
    const rowQb = this.ticketRepository
      .createQueryBuilder('ticket')
      .select('ticket.id', 'ticket_id')
      .addSelect(`(${SQL_PRIORITY_SCORE})`, 'priority_score')
      .leftJoin('ai_analyses', 'a', AI_JOIN_CONDITION, joinParams)
      .where('ticket.assigned_team_id = :teamId', { teamId: user.supportTeamId })
      .andWhere('ticket.assigned_team_id IS NOT NULL')
      .orderBy('priority_score', 'DESC')
      .addOrderBy('ticket.created_at', 'ASC')
      .addOrderBy('ticket.id', 'ASC')
      .limit(limit)
      .offset((page - 1) * limit);

    this.applyFilters(rowQb, query);
    this.applyPriorityFilter(rowQb, query);

    // ── Step 1B: count query (same joins + filters, no entity hydration) ─────
    const countQb = this.ticketRepository
      .createQueryBuilder('ticket')
      .select('COUNT(1)', 'cnt')
      .leftJoin('ai_analyses', 'a', AI_JOIN_CONDITION, joinParams)
      .where('ticket.assigned_team_id = :teamId', { teamId: user.supportTeamId })
      .andWhere('ticket.assigned_team_id IS NOT NULL');

    this.applyFilters(countQb, query);
    this.applyPriorityFilter(countQb, query);

    const [rows, countRow] = await Promise.all([
      rowQb.getRawMany<{ ticket_id: string; priority_score: string }>(),
      countQb.getRawOne<{ cnt: string }>(),
    ]);

    const ticketIds = rows.map((r) => r.ticket_id);
    const total = parseInt(countRow?.cnt ?? '0', 10);

    if (ticketIds.length === 0) {
      return {
        items: [],
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      };
    }

    // ── Step 2: full Ticket entities (proper TypeORM entity, no raw alias) ───
    const tickets = await this.ticketRepository.findBy({ id: In(ticketIds) });

    // ── Step 3: latest COMPLETED AiAnalysis per ticket (proper entity repo) ──
    // Subquery picks only the newest analysis row per ticket.
    const analyses = await this.aiAnalysisRepository
      .createQueryBuilder('a')
      .where('a.ticketId IN (:...ticketIds)', { ticketIds })
      .andWhere('a.status = :status', { status: AiAnalysisStatus.COMPLETED })
      .andWhere(
        `a.createdAt = (
          SELECT MAX(a2.created_at) FROM ai_analyses a2
          WHERE a2.ticket_id = a.ticket_id AND a2.status = :status
        )`,
      )
      .getMany();

    // ── Step 4: merge + map to DTOs ──────────────────────────────────────────
    const scoreById = new Map(rows.map((r) => [r.ticket_id, Number(r.priority_score ?? 0)]));
    const analysisMap = new Map(analyses.map((a) => [a.ticketId, a]));
    const ticketMap = new Map(tickets.map((t) => [t.id, t]));

    // Preserve DB ordering from Step 1
    const items = ticketIds
      .map((id) => {
        const ticket = ticketMap.get(id);
        if (!ticket) return null;
        return this.toItemDto(
          { ...ticket, ai: analysisMap.get(id) ?? null },
          scoreById,
          now,
        );
      })
      .filter((item): item is AgentTicketItemDto => item !== null);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  // ── Filter helpers ─────────────────────────────────────────────────────────
  // These operate on raw SQL column names (a.category, a.severity, etc.)
  // because alias 'a' is always a raw-table join in both rowQb and countQb.

  private applyFilters(
    qb: SelectQueryBuilder<Ticket>,
    query: AgentTicketQueryDto,
  ): void {
    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }
    if (query.category) {
      qb.andWhere('a.category = :category', { category: query.category });
    }
    if (query.severity) {
      qb.andWhere('a.severity = :severity', { severity: query.severity });
    }
    if (query.sentiment) {
      qb.andWhere('a.sentiment = :sentiment', { sentiment: query.sentiment });
    }
    if (query.requiresTechnician !== undefined) {
      qb.andWhere('a.requires_technician = :requiresTechnician', {
        requiresTechnician: query.requiresTechnician,
      });
    }
  }

  /** Priority filter operates on the SAME SQL score expression (approved plan). */
  private applyPriorityFilter(
    qb: SelectQueryBuilder<Ticket>,
    query: AgentTicketQueryDto,
  ): void {
    if (!query.priority) {
      return;
    }
    if (query.priority === TicketPriority.LOW) {
      // LOW band: everything below the MEDIUM threshold.
      const upper =
        PRIORITY_BANDS.find((b) => b.priority === TicketPriority.MEDIUM)?.minScore ?? 30;
      qb.andWhere(`(${SQL_PRIORITY_SCORE}) < :upperScore`, { upperScore: upper });
    } else {
      qb.andWhere(`(${SQL_PRIORITY_SCORE}) >= :minScore`, {
        minScore: bandMinScore(query.priority),
      });
    }
  }

  /** Map entity + AI analysis to the dashboard DTO (no entity leakage). */
  private toItemDto(
    ticket: Ticket & { ai?: AiAnalysis | null },
    scoreById: Map<string, number>,
    now: Date,
  ): AgentTicketItemDto {
    const analysis = ticket.ai ?? null;
    const insight: AgentTicketAiInsightDto | null =
      analysis && analysis.status === AiAnalysisStatus.COMPLETED
        ? {
            category: analysis.category as string,
            issueType: analysis.issueType as string,
            severity: analysis.severity as string,
            sentiment: analysis.sentiment as string,
            intent: analysis.intent as string,
            requiresTechnician: Boolean(analysis.requiresTechnician),
            confidence: analysis.confidence ?? 0,
          }
        : null;

    // Deterministic JS calculation is the authority for the returned score
    // (the SQL expression orders/filters; both share PRIORITY_WEIGHTS).
    const priorityInput: PriorityInput = {
      severity: (insight?.severity as AiSeverity) ?? null,
      requiresTechnician: insight ? insight.requiresTechnician : null,
      sentiment: (insight?.sentiment as AiSentiment) ?? null,
      createdAt: ticket.createdAt,
    };
    const { priorityScore, priority, factors } = this.priorityService.calculate(
      priorityInput,
      now,
    );

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority,
      priorityScore,
      priorityFactors: factors,
      createdAt: ticket.createdAt,
      ai: insight,
    };
  }

  /**
   * VS4 — Full ticket detail for the agent modal.
   *
   * Returns ticket + customer + latest COMPLETED AI analysis + computed priority.
   * Uses proper TypeORM entity relations (not raw table strings) so metadata
   * resolution is safe.
   */
  async findById(
    id: string,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<AgentTicketDetailDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['customer', 'assignedTeam', 'assignedAgent'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${id}" not found`);
    }

    if (!user.supportTeamId || ticket.assignedTeamId !== user.supportTeamId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    // Latest COMPLETED AI analysis for this ticket (proper entity query — safe)
    const analysis = await this.aiAnalysisRepository.findOne({
      where: { ticketId: id, status: AiAnalysisStatus.COMPLETED },
      order: { createdAt: 'DESC' },
    });

    // Map customer
    const customer: AgentTicketDetailCustomerDto = {
      id: ticket.customer.id,
      name: ticket.customer.name,
      email: ticket.customer.email,
      phone: ticket.customer.phone,
    };

    // Map AI analysis (null if not yet analysed)
    const ai: AgentTicketDetailAiDto | null = analysis
      ? {
          category: analysis.category as string,
          issueType: analysis.issueType as string,
          severity: analysis.severity as string,
          sentiment: analysis.sentiment as string,
          intent: analysis.intent as string,
          requiresTechnician: Boolean(analysis.requiresTechnician),
          confidence: analysis.confidence ?? 0,
          analysedAt: analysis.createdAt,
        }
      : null;

    // Compute priority using the same deterministic PriorityService
    const priorityInput: PriorityInput = {
      severity: (ai?.severity as AiSeverity) ?? null,
      requiresTechnician: ai ? ai.requiresTechnician : null,
      sentiment: (ai?.sentiment as AiSentiment) ?? null,
      createdAt: ticket.createdAt,
    };
    const { priorityScore, priority, factors } = this.priorityService.calculate(priorityInput, now);

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority,
      priorityScore,
      priorityFactors: factors,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      customer,
      ai,
      assignedTeam: ticket.assignedTeam
        ? {
            id: ticket.assignedTeam.id,
            name: ticket.assignedTeam.name,
            code: ticket.assignedTeam.code,
          }
        : null,
      assignedAgent: ticket.assignedAgent
        ? {
            id: ticket.assignedAgent.id,
            name: ticket.assignedAgent.name,
            email: ticket.assignedAgent.email,
          }
        : null,
    };
  }
}

