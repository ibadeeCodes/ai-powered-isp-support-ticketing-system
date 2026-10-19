import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Ticket } from './entities/ticket.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { CustomersModule } from '../customers/customers.module';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { TeamsModule } from '../teams/teams.module';
import { TicketProcessor, TICKET_PROCESSING_QUEUE } from './ticket.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket]),
    BullModule.registerQueue({
      name: TICKET_PROCESSING_QUEUE,
    }),
    CustomersModule,
    AuthModule,
    AiModule,
    TeamsModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketProcessor],
  exports: [TicketsService],
})
export class TicketsModule {}
