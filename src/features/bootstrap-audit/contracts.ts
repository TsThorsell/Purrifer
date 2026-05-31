export interface AuditTrailFilter {
  sourceFileId?: string;
  commitBatchId?: string;
}

export interface AuditTrailItem {
  sourceFileId: string;
  ingestBatchId: string;
  preprocessBatchId: string;
  stageBatchId: string;
  recordId: string;
  recordType: string;
  stageStatus: string;
  stageCreatedAt: string;
  reviewActionStatus?: string;
  reviewNote?: string;
  reviewAt?: string;
  commitBatchId?: string;
  committedAt?: string;
  objectType?: string;
  objectId?: string;
}

export interface BootstrapAuditApi {
  listAuditTrail(filter?: AuditTrailFilter): Promise<AuditTrailItem[]>;
}

export const bootstrapAuditChannels = {
  listAuditTrail: "bootstrap-audit:list-trail"
} as const;
