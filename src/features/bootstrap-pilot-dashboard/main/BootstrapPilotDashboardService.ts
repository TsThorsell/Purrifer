import type {
  PilotBatchMetric,
  PilotConfidenceBucket,
  PilotDashboardData,
  PilotDashboardFilter,
  PilotQualityKpis,
  PilotReasonBreakdownItem
} from "../contracts";
import { BootstrapPilotDashboardRepository } from "./BootstrapPilotDashboardRepository";

interface PreprocessPayloadRecord {
  confidence_score?: unknown;
}

interface PreprocessPayload {
  records?: PreprocessPayloadRecord[];
}

export class BootstrapPilotDashboardService {
  constructor(private readonly repository: BootstrapPilotDashboardRepository) {}

  async getDashboard(filter?: PilotDashboardFilter): Promise<PilotDashboardData> {
    const cleanFilter: PilotDashboardFilter = {
      ingestBatchId: filter?.ingestBatchId?.trim() || undefined,
      stageBatchId: filter?.stageBatchId?.trim() || undefined,
      sourceSystem: filter?.sourceSystem?.trim() || undefined
    };

    const [batchRows, reasonRows, reviewRows, preprocessRows] = await Promise.all([
      this.repository.listBatchRows(cleanFilter),
      this.repository.listReasonRows(cleanFilter),
      this.repository.listReviewRows(cleanFilter),
      this.repository.listPreprocessPayloadRows(cleanFilter)
    ]);

    return {
      filter: cleanFilter,
      kpis: this.buildKpis(batchRows, reviewRows.map((row) => row.actionStatus)),
      reasonBreakdown: this.buildReasonBreakdown(reasonRows.map((row) => row.reasonCodesJson)),
      confidenceDistribution: this.buildConfidenceDistribution(preprocessRows.map((row) => row.payloadJson)),
      batchMetrics: batchRows.map((row): PilotBatchMetric => ({
        ingestBatchId: row.ingestBatchId,
        stageBatchId: row.stageBatchId,
        sourceSystem: row.sourceSystem,
        stageCreatedAt: row.stageCreatedAt,
        totalRecords: row.totalRecords,
        readyCount: row.readyCount,
        needsReviewCount: row.needsReviewCount,
        rejectedCount: row.rejectedCount,
        committedCount: row.committedCount
      }))
    };
  }

  private buildKpis(batchRows: PilotBatchMetric[], reviewStatuses: string[]): PilotQualityKpis {
    const totalRecords = batchRows.reduce((sum, row) => sum + row.totalRecords, 0);
    const readyCount = batchRows.reduce((sum, row) => sum + row.readyCount, 0);
    const needsReviewCount = batchRows.reduce((sum, row) => sum + row.needsReviewCount, 0);
    const rejectedCount = batchRows.reduce((sum, row) => sum + row.rejectedCount, 0);
    const committedCount = batchRows.reduce((sum, row) => sum + row.committedCount, 0);

    const reviewedCount = reviewStatuses.length;
    const reviewApprovedCount = reviewStatuses.filter((status) => status === "approved").length;
    const reviewAcceptedIncompleteCount = reviewStatuses.filter(
      (status) => status === "accepted-incomplete"
    ).length;
    const reviewRejectedCount = reviewStatuses.filter((status) => status === "rejected").length;

    return {
      totalRecords,
      readyCount,
      needsReviewCount,
      rejectedCount,
      readyRate: this.rate(readyCount, totalRecords),
      reviewRate: this.rate(needsReviewCount, totalRecords),
      rejectionRate: this.rate(rejectedCount, totalRecords),
      reviewedCount,
      reviewApprovedCount,
      reviewAcceptedIncompleteCount,
      reviewRejectedCount,
      committedCount,
      commitCoverageRate: this.rate(committedCount, totalRecords)
    };
  }

  private buildReasonBreakdown(reasonCodesJsonList: string[]): PilotReasonBreakdownItem[] {
    const counts = new Map<string, number>();
    reasonCodesJsonList.forEach((json) => {
      let parsed: string[] = [];
      try {
        parsed = JSON.parse(json) as string[];
      } catch {
        parsed = [];
      }
      parsed.forEach((code) => {
        counts.set(code, (counts.get(code) ?? 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .map(([reasonCode, count]) => ({ reasonCode, count }))
      .sort((left, right) => right.count - left.count || left.reasonCode.localeCompare(right.reasonCode));
  }

  private buildConfidenceDistribution(payloads: string[]): PilotConfidenceBucket[] {
    const bucketCounts = new Map<string, number>([
      ["0.00-0.49", 0],
      ["0.50-0.69", 0],
      ["0.70-0.84", 0],
      ["0.85-1.00", 0],
      ["unknown", 0]
    ]);

    payloads.forEach((payloadJson) => {
      let parsed: PreprocessPayload | undefined;
      try {
        parsed = JSON.parse(payloadJson) as PreprocessPayload;
      } catch {
        parsed = undefined;
      }
      parsed?.records?.forEach((record) => {
        const bucket = this.confidenceBucket(record.confidence_score);
        bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
      });
    });

    return Array.from(bucketCounts.entries()).map(([bucketLabel, count]) => ({ bucketLabel, count }));
  }

  private confidenceBucket(value: unknown): string {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "unknown";
    }
    if (value < 0.5) return "0.00-0.49";
    if (value < 0.7) return "0.50-0.69";
    if (value < 0.85) return "0.70-0.84";
    return "0.85-1.00";
  }

  private rate(numerator: number, denominator: number): number {
    if (denominator === 0) {
      return 0;
    }
    return Math.round((numerator / denominator) * 10000) / 100;
  }
}


