import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AiAnalysis } from './entities/ai-analysis.entity';
import { GeminiService } from './gemini.service';
import { AiAnalysisValidator } from './ai-analysis.validator';
import { AiAnalysisService } from './ai-analysis.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, AiAnalysis])],
  providers: [GeminiService, AiAnalysisValidator, AiAnalysisService],
  exports: [AiAnalysisService],
})
export class AiModule {}
