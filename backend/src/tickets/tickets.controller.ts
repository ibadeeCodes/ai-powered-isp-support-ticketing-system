import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { Ticket } from './entities/ticket.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { AiAnalysis } from '../ai/entities/ai-analysis.entity';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createTicketDto: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Ticket> {
    return this.ticketsService.create(createTicketDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Ticket[]> {
    return this.ticketsService.findAll(user);
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Ticket> {
    return this.ticketsService.findById(id, user);
  }

  /**
   * VS2 — manual AI analysis trigger (e.g. re-analyze an existing ticket or
   * one whose automated analysis failed). Internal/agent-facing only; this is
   * NOT exposed to customers.
   */
  @Post(':id/analyze')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async analyze(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AiAnalysis> {
    const analysis = await this.ticketsService.triggerAnalysis(id, user);

    if (!analysis) {
      throw new ServiceUnavailableException(
        'AI analysis is unavailable or failed for this ticket. The ticket remains available for manual handling.',
      );
    }

    return analysis;
  }

  /**
   * VS4 — Update ticket status.
   * Agent/admin only — customers cannot change ticket status.
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Ticket> {
    return this.ticketsService.updateStatus(id, dto.status, user);
  }
}

