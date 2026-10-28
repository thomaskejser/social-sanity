-- Sources with the most kudos first, newest articles first within the same kudos.
SELECT a.article_id     AS "articleId",
       a.article,
       a.summary,
       a.content_html <> '' OR a.video_id <> '' AS "readable",
       a.video_id       AS "videoId",
       a.image_url      AS "imageUrl",
       a.url,
       a.published_at   AS "publishedAt",
       COALESCE(h.human, c.company, ch.channel, p.publisher) AS "owner",
       s.human_id       AS "humanId",
       s.company_id     AS "companyId",
       s.channel_id     AS "channelId",
       s.publisher_id   AS "publisherId",
       COALESCE(h.kudos, c.kudos, ch.kudos, p.kudos)     AS "kudos"
FROM article a
JOIN content_source s ON s.content_source_id = a.content_source_id
LEFT JOIN human h ON h.human_id = s.human_id
LEFT JOIN company c ON c.company_id = s.company_id
LEFT JOIN channel ch ON ch.channel_id = s.channel_id
LEFT JOIN publisher p ON p.publisher_id = s.publisher_id
WHERE a.published_at >= $since
  AND a.read_at IS NULL
ORDER BY "kudos" DESC, a.published_at DESC
LIMIT $limit;
