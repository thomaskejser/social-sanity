UPDATE content_source
SET feed_uri           = $feed_uri,
    last_fetched_at    = $fetched_at,
    last_fetch_ok      = $ok,
    last_fetch_message = $message
WHERE content_source_id = $content_source_id;
