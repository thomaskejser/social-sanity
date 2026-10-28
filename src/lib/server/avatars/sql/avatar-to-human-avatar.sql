-- Gives a human the picture of the company or channel it replaces, after the human's own.
INSERT INTO human_avatar (human_avatar_id, human_id, position, content_type, image, source_url,
                          fetched_at)
SELECT (SELECT COALESCE(MAX(human_avatar_id), 0) + 1 FROM human_avatar), $to_human_id,
       (SELECT COALESCE(MAX(position) + 1, 0) FROM human_avatar WHERE human_id = $to_human_id),
       a.content_type, a.image, a.source_url, a.fetched_at
FROM avatar a
WHERE a.company_id = $company_id
   OR a.channel_id = $channel_id
ON CONFLICT DO NOTHING;
