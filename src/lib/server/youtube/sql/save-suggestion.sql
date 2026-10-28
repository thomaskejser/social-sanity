UPDATE youtube_channel
SET suggested_kind    = $suggested_kind,
    suggested_name    = $suggested_name,
    suggestion_reason = $suggestion_reason
WHERE youtube_channel_id = $youtube_channel_id;
