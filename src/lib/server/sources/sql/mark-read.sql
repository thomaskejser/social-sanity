UPDATE article
SET read_at = $now
WHERE article_id = $article_id;
