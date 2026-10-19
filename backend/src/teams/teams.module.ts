import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTeam } from './entities/support-team.entity';
import { User } from '../auth/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketAssignmentService } from './ticket-assignment.service';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTeam, User, Ticket])],
  providers: [TicketAssignmentService],
  exports: [TypeOrmModule, TicketAssignmentService],
})
export class TeamsModule {}
