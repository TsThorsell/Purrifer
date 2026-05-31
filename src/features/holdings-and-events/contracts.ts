export type HoldingEventType = "deposit" | "withdrawal" | "valuation";

export interface HoldingSummary {
  holdingId: string;
  entityId: string;
  name: string;
  updatedAt: string;
}

export interface HoldingEvent {
  eventId: string;
  holdingId: string;
  eventType: HoldingEventType;
  eventDate: string;
  amount: number;
  note?: string;
  createdAt: string;
}

export interface HoldingDetails extends HoldingSummary {
  createdAt: string;
  timeline: HoldingEvent[];
}

export interface HoldingAnalysis {
  holdingId: string;
  totalInvested: number;
  averageAcquisitionValue?: number;
  averageAcquisitionRelevant: boolean;
  latestValuation?: number;
  totalValue: number;
  calculatedAt: string;
  definitions: {
    totalInvested: string;
    averageAcquisitionValue: string;
    latestValuation: string;
    totalValue: string;
  };
}

export interface CreateHoldingInput {
  entityId: string;
  name: string;
}

export interface CreateHoldingEventInput {
  holdingId: string;
  eventType: HoldingEventType;
  eventDate: string;
  amount: number;
  note?: string;
}

export interface HoldingsAndEventsApi {
  createHolding(input: CreateHoldingInput): Promise<HoldingDetails>;
  listHoldings(entityId?: string): Promise<HoldingSummary[]>;
  getHoldingDetails(holdingId: string): Promise<HoldingDetails>;
  createHoldingEvent(input: CreateHoldingEventInput): Promise<HoldingEvent>;
  getHoldingAnalysis(holdingId: string): Promise<HoldingAnalysis>;
}

export const holdingsAndEventsChannels = {
  createHolding: "holdings-and-events:create-holding",
  listHoldings: "holdings-and-events:list-holdings",
  getHoldingDetails: "holdings-and-events:get-holding-details",
  createHoldingEvent: "holdings-and-events:create-holding-event",
  getHoldingAnalysis: "holdings-and-events:get-holding-analysis"
} as const;
