import { AppError } from "@app/shared/errors/AppError";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import type {
  HoldingTimelineFilter,
  HoldingTimelineItem,
  CreateHoldingEventInput,
  CreateHoldingInput,
  HoldingAnalysis,
  HoldingDetails,
  HoldingEvent,
  HoldingSummary
} from "../contracts";
import { HoldingsAndEventsRepository } from "./HoldingsAndEventsRepository";

export class HoldingsAndEventsService {
  constructor(
    private readonly repository: HoldingsAndEventsRepository,
    private readonly sequenceStore: FileSequenceStore,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async createHolding(input: CreateHoldingInput): Promise<HoldingDetails> {
    if (!input.entityId.trim()) {
      throw new AppError({
        code: "BUSINESS_HOLDING_ENTITY_REQUIRED",
        message: "entityId kravs for Innehav.",
        type: "business"
      });
    }
    if (!input.name.trim()) {
      throw new AppError({
        code: "BUSINESS_HOLDING_NAME_REQUIRED",
        message: "Namn kravs for Innehav.",
        type: "business"
      });
    }

    const now = this.nowProvider().toISOString();
    const item: HoldingDetails = {
      holdingId: await this.sequenceStore.next("IH"),
      entityId: input.entityId.trim(),
      name: input.name.trim(),
      createdAt: now,
      updatedAt: now,
      timeline: []
    };

    await this.repository.createHolding(item);
    return item;
  }

  async listHoldings(entityId?: string): Promise<HoldingSummary[]> {
    return this.repository.listHoldings(entityId?.trim() || undefined);
  }

  async getHoldingDetails(holdingId: string): Promise<HoldingDetails> {
    const item = await this.repository.findHoldingById(holdingId);
    if (!item) {
      throw new AppError({
        code: "BUSINESS_HOLDING_NOT_FOUND",
        message: `Innehav ${holdingId} kunde inte hittas.`,
        type: "business"
      });
    }
    return item;
  }

  async createHoldingEvent(input: CreateHoldingEventInput): Promise<HoldingEvent> {
    if (!input.holdingId.trim()) {
      throw new AppError({
        code: "BUSINESS_HOLDING_EVENT_HOLDING_REQUIRED",
        message: "holdingId kravs for Handelse.",
        type: "business"
      });
    }
    if (!input.eventDate.trim()) {
      throw new AppError({
        code: "BUSINESS_HOLDING_EVENT_DATE_REQUIRED",
        message: "Datum kravs for Handelse.",
        type: "business"
      });
    }

    await this.getHoldingDetails(input.holdingId.trim());

    const now = this.nowProvider().toISOString();
    const item: HoldingEvent = {
      eventId: await this.sequenceStore.next("HE"),
      holdingId: input.holdingId.trim(),
      eventType: input.eventType,
      eventDate: input.eventDate.trim(),
      amount: Number(input.amount),
      note: input.note?.trim() || undefined,
      createdAt: now
    };
    await this.repository.createHoldingEvent(item);
    return item;
  }

  async listHoldingTimeline(filter: HoldingTimelineFilter = {}): Promise<HoldingTimelineItem[]> {
    const normalizedFilter: HoldingTimelineFilter = {
      holdingId: filter.holdingId?.trim(),
      entityId: filter.entityId?.trim(),
      eventType: filter.eventType,
      fromEventDate: filter.fromEventDate?.trim(),
      toEventDate: filter.toEventDate?.trim()
    };

    if (normalizedFilter.fromEventDate && normalizedFilter.toEventDate) {
      if (normalizedFilter.fromEventDate > normalizedFilter.toEventDate) {
        throw new AppError({
          code: "BUSINESS_HOLDING_EVENT_DATE_RANGE_INVALID",
          message: "fromEventDate får inte vara efter toEventDate.",
          type: "business"
        });
      }
    }

    return this.repository.listHoldingTimeline(normalizedFilter);
  }

  async getHoldingAnalysis(holdingId: string): Promise<HoldingAnalysis> {
    const holding = await this.getHoldingDetails(holdingId);
    const deposits = holding.timeline.filter((event) => event.eventType === "deposit");
    const withdrawals = holding.timeline.filter((event) => event.eventType === "withdrawal");
    const valuations = holding.timeline.filter((event) => event.eventType === "valuation");

    const depositedAmount = deposits.reduce((sum, event) => sum + Math.abs(event.amount), 0);
    const withdrawnAmount = withdrawals.reduce((sum, event) => sum + Math.abs(event.amount), 0);
    const totalInvested = depositedAmount - withdrawnAmount;

    const averageAcquisitionRelevant = deposits.length > 0;
    const averageAcquisitionValue = averageAcquisitionRelevant
      ? depositedAmount / deposits.length
      : undefined;

    const latestValuation = valuations[0]?.amount;
    const totalValue = latestValuation ?? totalInvested;

    return {
      holdingId: holding.holdingId,
      totalInvested,
      averageAcquisitionValue,
      averageAcquisitionRelevant,
      latestValuation,
      totalValue,
      calculatedAt: this.nowProvider().toISOString(),
      definitions: {
        totalInvested:
          "Totalt investerat = summa insattningar minus summa uttag (belopp tolkas i absoluta tal per handelsetyp).",
        averageAcquisitionValue:
          "Genomsnittligt anskaffningsvarde = snitt av insattningsbelopp. Visas endast nar insattningar finns.",
        latestValuation:
          "Senaste vardering = beloppet i den senast registrerade varderingshandelsen.",
        totalValue:
          "Totalvarde = senaste vardering om den finns, annars totalt investerat."
      }
    };
  }
}

