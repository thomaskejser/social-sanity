-- Attempts left publishing by a restart can't be resumed; the platform may or may not have the post.
UPDATE publish_attempts
SET status     = 'failed',
    error      = 'Publishing was interrupted by a restart. Check the platform before trying again, or the post may appear twice.',
    updated_at = $updated_at
WHERE status = 'publishing';
