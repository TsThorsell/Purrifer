export interface PilotDashboardFilter {
  ingestBatchId?: string;
  stageBatchId?: string;
  sourceSystem?: string;
}

export interface PilotQualityKpis {
  totalRecords: number;
  readyCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  readyRate: number;
  reviewRate: number;
  rejectionRate: number;
  reviewedCount: number;
  reviewApprovedCount: number;
  reviewAcceptedIncompleteCount: number;
  reviewRejectedCount: number;
  committedCount: number;
  commitCoverageRate: number;
}

export interface PilotConfidenceBucket {
  bucketLabel: string;
  count: number;
}

export interface PilotReasonBreakdownItem {
  reasonCode: string;
  count: number;
}

export interface PilotBatchMetric {
  ingestBatchId: string;
  stageBatchId: string;
  sourceSystem: string;
  stageCreatedAt: string;
  totalRecords: number;
  readyCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  committedCount: number;
}

export interface PilotDashboardData {
  filter: PilotDashboardFilter;
  kpis: PilotQualityKpis;
  reasonBreakdown: PilotReasonBreakdownItem[];
  confidenceDistribution: PilotConfidenceBucket[];
  batchMetrics: PilotBatchMetric[];
}

export interface BootstrapPilotDashboardApi {
  getDashboard(filter?: PilotDashboardFilter): Promise<PilotDashboardData>;
}

export const bootstrapPilotDashboardChannels = {
  getDashboard: "bootstrap-pilot-dashboard:get"
} as const;

