UPDATE publish_attempts
SET status     = 'failed',
    error      = $error,
    updated_at = $updated_at
WHERE post_id = $post_id
  AND platform = $platform;
