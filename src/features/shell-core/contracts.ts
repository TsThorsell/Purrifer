export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface JobSummary {
  id: string;
  label: string;
  status: JobStatus;
  startedAt: string;
  finishedAt?: string;
  detail?: string;
}

export interface ShellCoreApi {
  listJobs(): Promise<JobSummary[]>;
}

export const shellCoreChannels = {
  listJobs: "shell-core:list-jobs"
} as const;


