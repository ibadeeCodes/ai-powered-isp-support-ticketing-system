import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AiAnalysis } from './entities/ai-analysis.entity';
import { AiAnalysisService } from './ai-analysis.service';
import { AiAnalysisValidator } from './ai-analysis.validator';
import { GeminiService } from './gemini.service';
import { AiProviderError } from './ai.errors';
import { AiAnalysisStatus } from './ai.constants';

describe('AiAnalysisService', () => {
  let service: AiAnalysisService;
  let ticketRepository: { findOne: jest.Mock };
  let aiAnalysisRepository: { create: jest.Mock; save: jest.Mock };
  let geminiService: { analyzeTicket: jest.Mock; isConfigured: boolean; modelName: string };

  const mockTicket = {
    id: '44444444-4444-4444-8444-444444444444',
    subject: 'Internet completely stopped',
    description: 'My fiber internet has been down since morning. ONT shows a red LOS light.',
  };

  const validPayload = {
    category: 'CONNECTIVITY',
    issue_type: 'FIBER_SIGNAL_LOSS',
    severity: 'HIGH',
    sentiment: 'FRUSTRATED',
    intent: 'RESTORE_INTERNET',
    requires_technician: true,
    suggested_team: 'TECHNICAL_SUPPORT',
    confidence: 0.96,
  };

  const geminiResponse = (payload: unknown) => ({
    text: typeof payload === 'string' ? payload : JSON.stringify(payload),
    model: 'gemini-2.5-flash',
    inputTokens: 120,
    outputTokens: 45,
  });

  beforeEach(async () => {
    ticketRepository = { findOne: jest.fn().mockResolvedValue(mockTicket) };
    aiAnalysisRepository = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation(async (data) => ({
        ...data,
        id: '55555555-5555-5555-8555-555555555555',
        createdAt: new Date(),
      })),
    };
    geminiService = {
      analyzeTicket: jest.fn().mockResolvedValue(geminiResponse(validPayload)),
      isConfigured: true,
      modelName: 'gemini-2.5-flash',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAnalysisService,
        AiAnalysisValidator,
        { provide: getRepositoryToken(Ticket), useValue: ticketRepository },
        { provide: getRepositoryToken(AiAnalysis), useValue: aiAnalysisRepository },
        { provide: GeminiService, useValue: geminiService },
        // Defaults for AI_ENABLED / AI_MAX_RETRIES come from the ConfigService default args
        { provide: ConfigService, useValue: { get: (_key: string, def?: unknown) => def } },
      ],
    }).compile();

    service = module.get<AiAnalysisService>(AiAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeTicketById', () => {
    it('skips analysis without touching any repository when AI is not configured', async () => {
      geminiService.isConfigured = false;

      const result = await service.analyzeTicketById(mockTicket.id);

      expect(result).toBeNull();
      expect(ticketRepository.findOne).not.toHaveBeenCalled();
      expect(aiAnalysisRepository.save).not.toHaveBeenCalled();
    });

    it('skips analysis when the ticket does not exist', async () => {
      ticketRepository.findOne.mockResolvedValue(null);

      const result = await service.analyzeTicketById('00000000-0000-4000-8000-000000000000');

      expect(result).toBeNull();
      expect(geminiService.analyzeTicket).not.toHaveBeenCalled();
    });
  });

  describe('analyzeTicket', () => {
    it('persists a valid analysis with model, prompt version, tokens and latency', async () => {
      const result = await service.analyzeTicket(mockTicket as Ticket);

      expect(geminiService.analyzeTicket).toHaveBeenCalledWith(
        mockTicket.subject,
        mockTicket.description,
      );
      expect(aiAnalysisRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: mockTicket.id,
          status: AiAnalysisStatus.COMPLETED,
          category: 'CONNECTIVITY',
          issueType: 'FIBER_SIGNAL_LOSS',
          severity: 'HIGH',
          sentiment: 'FRUSTRATED',
          intent: 'RESTORE_INTERNET',
          requiresTechnician: true,
          suggestedTeam: 'TECHNICAL_SUPPORT',
          confidence: 0.96,
          model: 'gemini-2.5-flash',
          promptVersion: 'v2',
          inputTokens: 120,
          outputTokens: 45,
          latencyMs: expect.any(Number),
        }),
      );
      expect(result?.status).toBe(AiAnalysisStatus.COMPLETED);
    });

    it('retries once after an invalid response and then succeeds', async () => {
      geminiService.analyzeTicket
        .mockResolvedValueOnce(geminiResponse({ ...validPayload, category: 'MAGIC' }))
        .mockResolvedValueOnce(geminiResponse(validPayload));

      const result = await service.analyzeTicket(mockTicket as Ticket);

      expect(geminiService.analyzeTicket).toHaveBeenCalledTimes(2);
      expect(aiAnalysisRepository.save).toHaveBeenCalledTimes(1);
      expect(result?.status).toBe(AiAnalysisStatus.COMPLETED);
    });

    it('records a FAILED analysis (never throws) when the model invents unknown values', async () => {
      geminiService.analyzeTicket.mockResolvedValue(
        geminiResponse({ ...validPayload, category: 'MAGIC', issue_type: 'MAGIC_FIX' }),
      );

      const result = await service.analyzeTicket(mockTicket as Ticket);

      expect(geminiService.analyzeTicket).toHaveBeenCalledTimes(2); // 1 + 1 retry
      expect(result).toBeNull();
      expect(aiAnalysisRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: mockTicket.id,
          status: AiAnalysisStatus.FAILED,
          failureReason: expect.stringContaining('category must be one of'),
        }),
      );
    });

    it('rejects an issue_type that does not belong to the chosen category', async () => {
      geminiService.analyzeTicket.mockResolvedValue(
        geminiResponse({ ...validPayload, category: 'BILLING', issue_type: 'FIBER_SIGNAL_LOSS' }),
      );

      const result = await service.analyzeTicket(mockTicket as Ticket);

      expect(result).toBeNull();
      expect(aiAnalysisRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AiAnalysisStatus.FAILED,
          failureReason: expect.stringContaining('not valid for category'),
        }),
      );
    });

    it('records a FAILED analysis when the LLM provider errors', async () => {
      geminiService.analyzeTicket.mockRejectedValue(
        new AiProviderError('Gemini API request failed with status 503'),
      );

      const result = await service.analyzeTicket(mockTicket as Ticket);

      expect(result).toBeNull();
      expect(aiAnalysisRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AiAnalysisStatus.FAILED,
          failureReason: expect.stringContaining('503'),
        }),
      );
    });

    it('records a FAILED analysis when the model returns non-JSON text', async () => {
      geminiService.analyzeTicket.mockResolvedValue(geminiResponse('this is not json'));

      const result = await service.analyzeTicket(mockTicket as Ticket);

      expect(result).toBeNull();
      expect(aiAnalysisRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AiAnalysisStatus.FAILED,
          failureReason: expect.stringContaining('valid JSON'),
        }),
      );
    });

    it('strips markdown fences wrapped around the JSON payload', async () => {
      geminiService.analyzeTicket.mockResolvedValue({
        ...geminiResponse(validPayload),
        text: '```json\n' + JSON.stringify(validPayload) + '\n```',
      });

      const result = await service.analyzeTicket(mockTicket as Ticket);

      expect(result?.status).toBe(AiAnalysisStatus.COMPLETED);
      expect(result?.category).toBe('CONNECTIVITY');
    });

    it('normalizes free-text intent into UPPER_SNAKE_CASE deterministically', async () => {
      geminiService.analyzeTicket.mockResolvedValue(
        geminiResponse({ ...validPayload, intent: 'Report total internet outage!' }),
      );

      const result = await service.analyzeTicket(mockTicket as Ticket);

      expect(result?.status).toBe(AiAnalysisStatus.COMPLETED);
      expect(result?.intent).toBe('REPORT_TOTAL_INTERNET_OUTAGE');
    });
  });
});
