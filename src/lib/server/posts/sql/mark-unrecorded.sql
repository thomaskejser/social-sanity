UPDATE publish_attempts
SET status       = 'unrecorded',
    remote_id    = $remote_id,
    remote_url   = $remote_url,
    published_at = $published_at,
    error        = $error,
    updated_at   = $updated_at
WHERE post_id = $post_id
  AND platform = $platform;
