-- Keeps only the latest run of each job.
INSERT INTO background_job (background_job_id, background_job, started_at, finished_at, ok, outcome)
VALUES ((SELECT COALESCE(MAX(background_job_id), 0) + 1 FROM background_job), $background_job,
        $started_at, $finished_at, $ok, $outcome)
ON CONFLICT (background_job) DO UPDATE SET
    started_at  = excluded.started_at,
    finished_at = excluded.finished_at,
    ok          = excluded.ok,
    outcome     = excluded.outcome;
