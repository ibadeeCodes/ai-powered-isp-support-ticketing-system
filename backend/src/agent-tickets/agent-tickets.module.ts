import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AiAnalysis } from '../ai/entities/ai-analysis.entity';
import { Customer } from '../customers/entities/customer.entity';
import { AuthModule } from '../auth/auth.module';
import { AgentTicketsController } from './agent-tickets.controller';
import { AgentTicketsService } from './agent-tickets.service';
import { PriorityService } from './priority.service';
import { AgentCustomersController } from './agent-customers.controller';
import { AgentCustomersService } from './agent-customers.service';

/**
 * VS3 — Agent dashboard module.
 *
 * Owns two agent-facing read-only slices:
 *  - Ticket queue  (GET /agent/tickets)
 *  - Customer lookup (GET /agent/customers)
 *
 * Deliberately does NOT import TicketsModule, CustomersModule, or AiModule:
 * this slice consumes persisted data only and must not gain any LLM capability
 * (spec §22 — no LLM calls from the dashboard).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Ticket, AiAnalysis, Customer]), AuthModule],
  controllers: [AgentTicketsController, AgentCustomersController],
  providers: [AgentTicketsService, PriorityService, AgentCustomersService],
})
export class AgentTicketsModule {}
