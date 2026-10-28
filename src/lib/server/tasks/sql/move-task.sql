UPDATE task
SET urgent     = $urgent,
    important  = $important,
    updated_at = $now
WHERE task_id = $task_id;
