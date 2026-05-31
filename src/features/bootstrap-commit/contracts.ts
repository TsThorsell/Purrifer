export interface BootstrapCommitInput {
  stageBatchId: string;
}

export interface BootstrapCommitObject {
  recordId: string;
  recordType: string;
  objectType: "Dokument" | "Verifikat" | "Leverantorsfaktura" | "Betalhandelse";
  objectId: string;
}

export interface BootstrapCommitResult {
  commitBatchId: string;
  stageBatchId: string;
  committedAt: string;
  totalEligible: number;
  committedCount: number;
  alreadyCommittedCount: number;
  replayed: boolean;
  objects: BootstrapCommitObject[];
}

export interface BootstrapCommitSummary {
  commitBatchId: string;
  stageBatchId: string;
  committedAt: string;
  committedCount: number;
}

export interface BootstrapCommitApi {
  runCommit(input: BootstrapCommitInput): Promise<BootstrapCommitResult>;
  listCommits(): Promise<BootstrapCommitSummary[]>;
  getCommit(commitBatchId: string): Promise<BootstrapCommitResult>;
}

export const bootstrapCommitChannels = {
  runCommit: "bootstrap-commit:run",
  listCommits: "bootstrap-commit:list",
  getCommit: "bootstrap-commit:get"
} as const;
