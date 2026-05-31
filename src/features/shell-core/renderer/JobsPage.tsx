import { useEffect, useState } from "react";
import type { JobSummary } from "../contracts";

export function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.purrifer.shellCore
      .listJobs()
      .then(setJobs)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Kunde inte läsa jobb.");
      });
  }, []);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Shell Core</p>
          <h2>Jobbpanel</h2>
          <p className="muted">Visar bakgrundsjobb, bootstrapjobb och senare OCR-, import- och backupjobb.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="stacked-list">
        {jobs.map((job) => (
          <article key={job.id} className="list-card">
            <div className="list-card-topline">
              <h3>{job.label}</h3>
              <span className={`status-pill ${job.status}`}>{job.status}</span>
            </div>
            <p className="muted">{job.detail ?? "Ingen detalj tillgänglig."}</p>
            <small>
              {job.startedAt}
              {job.finishedAt ? ` -> ${job.finishedAt}` : ""}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}
