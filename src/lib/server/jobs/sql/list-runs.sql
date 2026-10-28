SELECT background_job AS "name",
       started_at     AS "startedAt",
       finished_at    AS "finishedAt",
       ok,
       outcome
FROM background_job;
