-- Unread recent articles with no picture whose page has not been looked at yet, newest first.
SELECT article_id AS "articleId",
       url
FROM article
WHERE image_url = ''
  AND image_checked_at IS NULL
  AND read_at IS NULL
  AND published_at >= $since
ORDER BY published_at DESC
LIMIT $limit;
