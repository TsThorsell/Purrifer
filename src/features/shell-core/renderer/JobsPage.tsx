import { useEffect, useState } from "react";
import { Page, PageHeader, Panel, Stack, StatusPill } from "../../../renderer/components/Ui";
import type { JobSummary } from "../contracts";

export function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const shellCore = window.purrifer?.shellCore;

    if (!shellCore?.listJobs) {
      setError("Preload API kunde inte laddas. Starta om appen med korrekt launcher.");
      return;
    }

    let isMounted = true;

    void shellCore
      .listJobs()
      .then((nextJobs) => {
        if (isMounted) {
          setJobs(nextJobs);
        }
      })
      .catch((reason: unknown) => {
        if (isMounted) {
          setError(reason instanceof Error ? reason.message : "Kunde inte läsa jobb.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Page>
      <PageHeader
        eyebrow="Shell Core"
        title="Jobbpanel"
        description="Visar bakgrundsjobb, bootstrapjobb och senare OCR-, import- och backupjobb."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Jobb" status={<StatusPill>{jobs.length}</StatusPill>}>
        <Stack>
          {jobs.length === 0 ? (
            <p className="ui-muted">
              Inga jobb att visa än. När import, OCR, bootstrap eller backup körs dyker de upp här.
            </p>
          ) : (
            jobs.map((job) => (
              <article key={job.id} className="ui-card">
                <div className="ui-card__header">
                  <div className="ui-card__title-block">
                    <h3>{job.label}</h3>
                  </div>
                  <StatusPill tone={job.status === "completed" ? "success" : job.status === "running" ? "warning" : job.status === "failed" ? "danger" : "neutral"}>
                    {job.status}
                  </StatusPill>
                </div>
                <p className="ui-muted">{job.detail ?? "Ingen detalj tillgänglig."}</p>
                <small>{job.startedAt}{job.finishedAt ? ` -> ${job.finishedAt}` : ""}</small>
              </article>
            ))
          )}
        </Stack>
      </Panel>
    </Page>
  );
}

