/**
 * VS2 — AI Ticket Analysis domain constants.
 *
 * Categories and issue types are taken verbatim from docs/domain.md.
 * The LLM may ONLY choose values from these sets — the backend rejects
 * anything else ("LLM interprets, backend validates and decides").
 */

export enum TicketCategory {
  CONNECTIVITY = 'CONNECTIVITY',
  HARDWARE = 'HARDWARE',
  BILLING = 'BILLING',
  INSTALLATION = 'INSTALLATION',
  PACKAGE = 'PACKAGE',
  ACCOUNT = 'ACCOUNT',
  OTHER = 'OTHER',
}

export enum IssueType {
  // CONNECTIVITY
  NO_INTERNET = 'NO_INTERNET',
  FREQUENT_DISCONNECTION = 'FREQUENT_DISCONNECTION',
  SLOW_INTERNET = 'SLOW_INTERNET',
  HIGH_LATENCY = 'HIGH_LATENCY',
  INTERMITTENT_CONNECTION = 'INTERMITTENT_CONNECTION',
  FIBER_SIGNAL_LOSS = 'FIBER_SIGNAL_LOSS',
  // HARDWARE
  ROUTER_ISSUE = 'ROUTER_ISSUE',
  ONT_ISSUE = 'ONT_ISSUE',
  WIFI_ISSUE = 'WIFI_ISSUE',
  DEVICE_CONFIGURATION = 'DEVICE_CONFIGURATION',
  // BILLING
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  INCORRECT_BILL = 'INCORRECT_BILL',
  DUPLICATE_CHARGE = 'DUPLICATE_CHARGE',
  PACKAGE_SUBSCRIPTION_ISSUE = 'PACKAGE_SUBSCRIPTION_ISSUE',
  // INSTALLATION
  NEW_INSTALLATION = 'NEW_INSTALLATION',
  INSTALLATION_DELAY = 'INSTALLATION_DELAY',
  RELOCATION = 'RELOCATION',
  // PACKAGE
  UPGRADE = 'UPGRADE',
  DOWNGRADE = 'DOWNGRADE',
  PACKAGE_INFORMATION = 'PACKAGE_INFORMATION',
  ADD_ONS = 'ADD_ONS',
  // ACCOUNT
  LOGIN_ISSUE = 'LOGIN_ISSUE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_INFORMATION = 'ACCOUNT_INFORMATION',
  // OTHER
  OTHER = 'OTHER',
}

export const ISSUE_TYPES_BY_CATEGORY: Record<TicketCategory, IssueType[]> = {
  [TicketCategory.CONNECTIVITY]: [
    IssueType.NO_INTERNET,
    IssueType.FREQUENT_DISCONNECTION,
    IssueType.SLOW_INTERNET,
    IssueType.HIGH_LATENCY,
    IssueType.INTERMITTENT_CONNECTION,
    IssueType.FIBER_SIGNAL_LOSS,
  ],
  [TicketCategory.HARDWARE]: [
    IssueType.ROUTER_ISSUE,
    IssueType.ONT_ISSUE,
    IssueType.WIFI_ISSUE,
    IssueType.DEVICE_CONFIGURATION,
  ],
  [TicketCategory.BILLING]: [
    IssueType.PAYMENT_ISSUE,
    IssueType.INCORRECT_BILL,
    IssueType.DUPLICATE_CHARGE,
    IssueType.PACKAGE_SUBSCRIPTION_ISSUE,
  ],
  [TicketCategory.INSTALLATION]: [
    IssueType.NEW_INSTALLATION,
    IssueType.INSTALLATION_DELAY,
    IssueType.RELOCATION,
  ],
  [TicketCategory.PACKAGE]: [
    IssueType.UPGRADE,
    IssueType.DOWNGRADE,
    IssueType.PACKAGE_INFORMATION,
    IssueType.ADD_ONS,
  ],
  [TicketCategory.ACCOUNT]: [
    IssueType.LOGIN_ISSUE,
    IssueType.PASSWORD_RESET,
    IssueType.ACCOUNT_INFORMATION,
  ],
  [TicketCategory.OTHER]: [IssueType.OTHER],
};

export enum AiSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AiSentiment {
  NEUTRAL = 'NEUTRAL',
  CONCERNED = 'CONCERNED',
  FRUSTRATED = 'FRUSTRATED',
  ANGRY = 'ANGRY',
}

/** Lifecycle of an analysis row (observability for LLM failures). */
export enum AiAnalysisStatus {
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const ALL_TICKET_CATEGORIES: string[] = Object.values(TicketCategory);
export const ALL_ISSUE_TYPES: string[] = Object.values(IssueType);
export const ALL_SEVERITIES: string[] = Object.values(AiSeverity);
export const ALL_SENTIMENTS: string[] = Object.values(AiSentiment);
export const SUPPORTED_TEAM_CODES = [
  'NETWORK_OPERATIONS',
  'TECHNICAL_SUPPORT',
  'BILLING',
  'INSTALLATION',
] as const;

export const DEFAULT_SUPPORT_TEAM_CODE = 'TECHNICAL_SUPPORT';

