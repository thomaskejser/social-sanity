-- Gives a company or channel the shown picture of the human it replaces, unless it has one.
INSERT INTO avatar (avatar_id, company_id, channel_id, content_type, image, source_url, fetched_at)
SELECT (SELECT COALESCE(MAX(avatar_id), 0) + 1 FROM avatar), $to_company_id, $to_channel_id,
       h.content_type, h.image, h.source_url, h.fetched_at
FROM human_avatar h
WHERE h.human_id = $human_id
  AND NOT EXISTS (SELECT 1
                  FROM avatar a
                  WHERE a.company_id = $to_company_id OR a.channel_id = $to_channel_id)
ORDER BY h.position, h.human_avatar_id
LIMIT 1;
