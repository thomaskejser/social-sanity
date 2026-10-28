-- A picture found later on the article's page is kept when the feed has none.
INSERT INTO article (article_id, content_source_id, guid, article, summary, content_html, video_id,
                     image_url, url, published_at)
VALUES ((SELECT COALESCE(MAX(article_id), 0) + 1 FROM article), $content_source_id, $guid, $article,
        $summary, $content_html, $video_id, $image_url, $url, $published_at)
ON CONFLICT (content_source_id, guid) DO UPDATE SET
    article      = excluded.article,
    summary      = excluded.summary,
    content_html = excluded.content_html,
    video_id     = excluded.video_id,
    image_url    = CASE WHEN excluded.image_url <> '' THEN excluded.image_url ELSE article.image_url END,
    url          = excluded.url,
    published_at = excluded.published_at;
