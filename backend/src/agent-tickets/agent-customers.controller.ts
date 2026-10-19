import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AgentCustomersService } from './agent-customers.service';
import { AgentCustomerQueryDto } from './dto/agent-customer-query.dto';
import { AgentCustomerTicketsQueryDto } from './dto/agent-customer-tickets-query.dto';
import {
  AgentCustomersPageDto,
  AgentCustomerProfileDto,
  AgentCustomerTicketsPageDto,
} from './dto/agent-customer-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

/**
 * Agent-facing customer lookup API.
 *
 * Restricted to AGENT and ADMIN roles — customers cannot search other customers.
 *
 * GET /agent/customers                     — paginated list with id / phone filters
 * GET /agent/customers/:customerId         — customer details only (no tickets)
 * GET /agent/customers/:customerId/tickets — paginated tickets for customer
 */
@Controller('agent/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class AgentCustomersController {
  constructor(private readonly agentCustomersService: AgentCustomersService) {}

  /**
   * Search / list customers for the agent dashboard customer lookup panel.
   */
  @Get()
  search(@Query() query: AgentCustomerQueryDto): Promise<AgentCustomersPageDto> {
    return this.agentCustomersService.search(query);
  }

  /**
   * Customer details only — no tickets.
   */
  @Get(':customerId')
  findProfileById(
    @Param('customerId', new ParseUUIDPipe({ version: undefined })) customerId: string,
  ): Promise<AgentCustomerProfileDto> {
    return this.agentCustomersService.findProfileById(customerId);
  }

  /**
   * Paginated ticket list for a specific customer.
   */
  @Get(':customerId/tickets')
  findTicketsByCustomerId(
    @Param('customerId', new ParseUUIDPipe({ version: undefined })) customerId: string,
    @Query() query: AgentCustomerTicketsQueryDto,
  ): Promise<AgentCustomerTicketsPageDto> {
    return this.agentCustomersService.findTicketsByCustomerId(customerId, query);
  }
}
