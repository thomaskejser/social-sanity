SELECT a.article_id     AS "articleId",
       a.article,
       a.summary,
       a.content_html   AS "contentHtml",
       a.video_id       AS "videoId",
       a.url,
       a.published_at   AS "publishedAt",
       COALESCE(h.human, c.company, ch.channel, p.publisher) AS "owner"
FROM article a
JOIN content_source s ON s.content_source_id = a.content_source_id
LEFT JOIN human h ON h.human_id = s.human_id
LEFT JOIN company c ON c.company_id = s.company_id
LEFT JOIN channel ch ON ch.channel_id = s.channel_id
LEFT JOIN publisher p ON p.publisher_id = s.publisher_id
WHERE a.article_id = $article_id;
