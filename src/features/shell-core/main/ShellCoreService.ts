import type { JobSummary } from "../contracts";

export class ShellCoreService {
  async listJobs(): Promise<JobSummary[]> {
    return [
      {
        id: "job_bootstrap_001",
        label: "Shell-core bootstrap",
        status: "completed",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        detail: "Appskal, navigation och slice-registrering är laddade."
      }
    ];
  }
}
