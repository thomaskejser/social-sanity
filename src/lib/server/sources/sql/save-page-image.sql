UPDATE article
SET image_url        = $image_url,
    image_checked_at = $now
WHERE article_id = $article_id;
