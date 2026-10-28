-- Only a new or failed attempt may start; one publishing or awaiting recording is left alone.
INSERT INTO publish_attempts (post_id, platform, status, error, updated_at)
VALUES ($post_id, $platform, 'publishing', NULL, $updated_at)
ON CONFLICT (post_id, platform) DO UPDATE SET
    status     = 'publishing',
    error      = NULL,
    updated_at = excluded.updated_at
WHERE publish_attempts.status = 'failed';
