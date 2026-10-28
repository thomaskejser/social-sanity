-- Records with an outside ID but no picture yet, with the picture YouTube has for them, if any.
SELECT r.source,
       r.external_reference AS "externalReference",
       r.human_id           AS "humanId",
       r.company_id         AS "companyId",
       r.channel_id         AS "channelId",
       COALESCE(y.thumbnail_url, '') AS "youtubeThumbnail"
FROM external_reference r
LEFT JOIN youtube_channel y ON r.source = 'YOUTUBE' AND y.channel_id = r.external_reference
WHERE r.publisher_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM human_avatar h WHERE h.human_id = r.human_id)
  AND NOT EXISTS (SELECT 1
                  FROM avatar a
                  WHERE a.company_id = r.company_id
                     OR a.channel_id = r.channel_id)
ORDER BY r.external_reference_id;
