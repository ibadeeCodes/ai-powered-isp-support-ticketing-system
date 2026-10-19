import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AgentTicketsService } from './agent-tickets.service';
import { AgentTicketQueryDto } from './dto/agent-ticket-query.dto';
import { AgentTicketsPageDto } from './dto/agent-ticket-response.dto';
import { AgentTicketDetailDto } from './dto/agent-ticket-detail.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

/**
 * VS3/VS4 — Agent ticket queue + detail API.
 *
 * Agent-facing only. The controller handles HTTP concerns exclusively:
 * query binding/validation (DTO) and authorization; all business logic
 * (querying, prioritization, mapping) lives in AgentTicketsService.
 *
 * GET /agent/tickets      — paginated, prioritized queue
 * GET /agent/tickets/:id  — enriched ticket detail (ticket + customer + AI)
 */
@Controller('agent/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT)
export class AgentTicketsController {
  constructor(private readonly agentTicketsService: AgentTicketsService) {}

  /**
   * Paginated, filterable, deterministically prioritized ticket queue.
   * All query parameters are validated via AgentTicketQueryDto; unknown
   * parameters are rejected by the global ValidationPipe.
   */
  @Get()
  getQueue(
    @Query() query: AgentTicketQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AgentTicketsPageDto> {
    return this.agentTicketsService.getQueue(query, user);
  }

  /**
   * VS4 — Full ticket detail for the agent modal.
   * Returns ticket + customer summary + latest AI analysis + computed priority
   * in a single enriched response shaped for the agent UI.
   */
  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AgentTicketDetailDto> {
    return this.agentTicketsService.findById(id, user);
  }
}
