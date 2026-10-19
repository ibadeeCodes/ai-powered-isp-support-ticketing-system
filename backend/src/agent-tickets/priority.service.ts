import { Injectable } from '@nestjs/common';
import { TicketPriority } from '../tickets/entities/ticket.entity';
import { AiSentiment, AiSeverity } from '../ai/ai.constants';

/** Structured ticket/AI information used to compute operational priority. */
export interface PriorityInput {
  severity?: AiSeverity | null;
  requiresTechnician?: boolean | null;
  sentiment?: AiSentiment | null;
  createdAt: Date;
}

/** Explainable breakdown of the score (spec §6: score must be explainable). */
export interface PriorityFactors {
  severity: number;
  technicianRequired: number;
  waitingTime: number;
  sentiment: number;
}

export interface PriorityResult {
  priorityScore: number;
  priority: TicketPriority;
  factors: PriorityFactors;
}

/**
 * VS3 — centralized deterministic priority weights.
 *
 * "AI interprets. Backend decides." These weights convert persisted AI
 * signals into operational priority. They are the SINGLE source of truth:
 * the agent-queue SQL ordering/filtering expression in
 * agent-tickets.service.ts is generated from this object and must never
 * drift from it.
 *
 * Waiting-time buckets follow the spec: < 30 min → 0, 30–120 min → 5,
 * > 120 min → 10 (exactly 120 min belongs to the 30–120 bucket).
 */
export const PRIORITY_WEIGHTS = {
  severity: {
    CRITICAL: 40,
    HIGH: 25,
    MEDIUM: 15,
    LOW: 5,
  } as Record<AiSeverity, number>,
  technicianRequired: 15,
  waitingTime: {
    bucket1MaxSeconds: 30 * 60,
    bucket2MaxSeconds: 120 * 60,
    bucket1: 0,
    bucket2: 5,
    bucket3: 10,
  },
  sentiment: {
    ANGRY: 10,
    FRUSTRATED: 5,
    CONCERNED: 2,
    NEUTRAL: 0,
  } as Record<AiSentiment, number>,
} as const;

/** Score → operational priority bands (first match wins). */
export const PRIORITY_BANDS: Array<{ minScore: number; priority: TicketPriority }> = [
  { minScore: 70, priority: TicketPriority.CRITICAL },
  { minScore: 50, priority: TicketPriority.HIGH },
  { minScore: 30, priority: TicketPriority.MEDIUM },
  { minScore: 0, priority: TicketPriority.LOW },
];

@Injectable()
export class PriorityService {
  /**
   * Deterministically compute the operational priority.
   * Missing AI analysis degrades gracefully: those factors contribute 0 and
   * the ticket is still scored on waiting time (spec §13).
   * `now` is injectable so the calculation is fully deterministic in tests.
   */
  calculate(input: PriorityInput, now: Date = new Date()): PriorityResult {
    const factors: PriorityFactors = {
      severity: input.severity ? (PRIORITY_WEIGHTS.severity[input.severity] ?? 0) : 0,
      technicianRequired: input.requiresTechnician ? PRIORITY_WEIGHTS.technicianRequired : 0,
      waitingTime: this.waitingTimeWeight(input.createdAt, now),
      sentiment: input.sentiment ? (PRIORITY_WEIGHTS.sentiment[input.sentiment] ?? 0) : 0,
    };

    const priorityScore =
      factors.severity + factors.technicianRequired + factors.waitingTime + factors.sentiment;

    return { priorityScore, priority: this.band(priorityScore), factors };
  }

  private waitingTimeWeight(createdAt: Date, now: Date): number {
    const waitedSeconds = Math.max(0, (now.getTime() - createdAt.getTime()) / 1000);
    if (waitedSeconds > PRIORITY_WEIGHTS.waitingTime.bucket2MaxSeconds) {
      return PRIORITY_WEIGHTS.waitingTime.bucket3;
    }
    if (waitedSeconds >= PRIORITY_WEIGHTS.waitingTime.bucket1MaxSeconds) {
      return PRIORITY_WEIGHTS.waitingTime.bucket2;
    }
    return PRIORITY_WEIGHTS.waitingTime.bucket1;
  }

  private band(score: number): TicketPriority {
    for (const band of PRIORITY_BANDS) {
      if (score >= band.minScore) {
        return band.priority;
      }
    }
    return TicketPriority.LOW;
  }
}
