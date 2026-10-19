import { IsEnum } from 'class-validator';
import { TicketStatus } from '../../tickets/entities/ticket.entity';

/**
 * Request body for PATCH /tickets/:id/status.
 * Only the status field — keeps the update scope narrow and prevents
 * accidental overwrites of other ticket fields.
 */
export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus, {
    message: `status must be one of: ${Object.values(TicketStatus).join(', ')}`,
  })
  status: TicketStatus;
}

