import type { AuditTrailFilter, AuditTrailItem } from "../contracts";
import { BootstrapAuditRepository } from "./BootstrapAuditRepository";

export class BootstrapAuditService {
  constructor(private readonly repository: BootstrapAuditRepository) {}

  async listAuditTrail(filter?: AuditTrailFilter): Promise<AuditTrailItem[]> {
    return this.repository.listAuditTrail({
      sourceFileId: filter?.sourceFileId?.trim() || undefined,
      commitBatchId: filter?.commitBatchId?.trim() || undefined
    });
  }
}
