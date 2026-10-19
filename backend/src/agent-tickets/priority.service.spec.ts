import { Test, TestingModule } from '@nestjs/testing';
import { PriorityService, PRIORITY_WEIGHTS } from './priority.service';
import { AiSentiment, AiSeverity } from '../ai/ai.constants';

describe('PriorityService', () => {
  let service: PriorityService;
  // Fixed clock: 2026-09-19T12:00:00Z
  const NOW = new Date('2026-09-19T12:00:00Z');

  const at = (minutesBefore: number) =>
    new Date(NOW.getTime() - minutesBefore * 60 * 1000);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriorityService],
    }).compile();
    service = module.get<PriorityService>(PriorityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('severity weights', () => {
    it('weights each severity per the centralized table', () => {
      for (const [severity, weight] of Object.entries(PRIORITY_WEIGHTS.severity)) {
        const result = service.calculate(
          { severity: severity as AiSeverity, createdAt: at(0) },
          NOW,
        );
        expect(result.factors.severity).toBe(weight);
        expect(result.priorityScore).toBe(weight);
      }
    });

    it('missing AI analysis contributes 0 but keeps the ticket scored on waiting time', () => {
      const result = service.calculate({ createdAt: at(200) }, NOW);

      expect(result.factors.severity).toBe(0);
      expect(result.factors.waitingTime).toBe(10);
      expect(result.priorityScore).toBe(10);
    });
  });

  describe('technician weight', () => {
    it('adds 15 when a technician is required and 0 otherwise', () => {
      const required = service.calculate(
        { severity: AiSeverity.LOW, requiresTechnician: true, createdAt: at(0) },
        NOW,
      );
      const notRequired = service.calculate(
        { severity: AiSeverity.LOW, requiresTechnician: false, createdAt: at(0) },
        NOW,
      );
      const missing = service.calculate({ severity: AiSeverity.LOW, createdAt: at(0) }, NOW);

      expect(required.factors.technicianRequired).toBe(15);
      expect(notRequired.factors.technicianRequired).toBe(0);
      expect(missing.factors.technicianRequired).toBe(0);
    });
  });

  describe('waiting-time boundaries', () => {
    it('0 weight below 30 minutes', () => {
      expect(service.calculate({ createdAt: at(0) }, NOW).factors.waitingTime).toBe(0);
      expect(service.calculate({ createdAt: at(29) }, NOW).factors.waitingTime).toBe(0);
    });

    it('5 weight at exactly 30 minutes through 120 minutes', () => {
      expect(service.calculate({ createdAt: at(30) }, NOW).factors.waitingTime).toBe(5);
      expect(service.calculate({ createdAt: at(60) }, NOW).factors.waitingTime).toBe(5);
      expect(service.calculate({ createdAt: at(120) }, NOW).factors.waitingTime).toBe(5);
    });

    it('10 weight strictly above 120 minutes', () => {
      expect(service.calculate({ createdAt: at(121) }, NOW).factors.waitingTime).toBe(10);
      expect(service.calculate({ createdAt: at(600) }, NOW).factors.waitingTime).toBe(10);
    });
  });

  describe('sentiment weights', () => {
    it('weights each sentiment per the centralized table', () => {
      for (const [sentiment, weight] of Object.entries(PRIORITY_WEIGHTS.sentiment)) {
        const result = service.calculate(
          { sentiment: sentiment as AiSentiment, createdAt: at(0) },
          NOW,
        );
        expect(result.factors.sentiment).toBe(weight);
      }
    });

    it('missing sentiment contributes 0', () => {
      const result = service.calculate({ createdAt: at(0) }, NOW);
      expect(result.factors.sentiment).toBe(0);
    });
  });

  describe('combined factors and bands', () => {
    it('combines severity + technician + waiting time + sentiment into one score', () => {
      // CRITICAL(40) + technician(15) + 3h wait(10) + FRUSTRATED(5) = 70
      const result = service.calculate(
        {
          severity: AiSeverity.CRITICAL,
          requiresTechnician: true,
          sentiment: AiSentiment.FRUSTRATED,
          createdAt: at(180),
        },
        NOW,
      );

      expect(result.priorityScore).toBe(70);
      expect(result.priority).toBe('CRITICAL');
  });

    it('maps scores to the documented priority bands', () => {
      // 25 (HIGH severity) + 0 wait = 25 → LOW band
      expect(
        service.calculate({ severity: AiSeverity.HIGH, createdAt: at(0) }, NOW).priority,
      ).toBe('LOW');
      // 25 + 5 wait + 2 sentiment = 32 → MEDIUM band
      expect(
        service.calculate(
          { severity: AiSeverity.HIGH, sentiment: AiSentiment.CONCERNED, createdAt: at(60) },
          NOW,
        ).priority,
      ).toBe('MEDIUM');
      // 40 + 15 = 55 → HIGH band
      expect(
        service.calculate(
          { severity: AiSeverity.CRITICAL, requiresTechnician: true, createdAt: at(0) },
          NOW,
        ).priority,
      ).toBe('HIGH');
  });
  });

  describe('determinism', () => {
    it('produces identical output for identical input', () => {
      const input = {
        severity: AiSeverity.HIGH,
        requiresTechnician: true,
        sentiment: AiSentiment.ANGRY,
        createdAt: at(45),
      };

      const first = service.calculate(input, NOW);
      const second = service.calculate(input, NOW);

      expect(second.priorityScore).toBe(first.priorityScore);
      expect(second.priority).toBe(first.priority);
      expect(second.factors).toEqual(first.factors);
    });
  });
});
