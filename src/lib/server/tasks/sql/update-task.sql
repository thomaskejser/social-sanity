UPDATE task
SET task        = $task,
    description = $description,
    urgent      = $urgent,
    important   = $important,
    due_date    = $due_date,
    updated_at  = $now
WHERE task_id = $task_id;
