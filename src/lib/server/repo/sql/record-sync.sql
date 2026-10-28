UPDATE git_repo
SET last_sync_at      = $synced_at,
    last_sync_ok      = $ok,
    last_sync_message = $message
WHERE id = 1;
