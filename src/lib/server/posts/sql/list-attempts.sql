SELECT post_id      AS "postId",
       platform,
       status,
       error,
       remote_id    AS "remoteId",
       remote_url   AS "remoteUrl",
       published_at AS "publishedAt",
       updated_at   AS "updatedAt"
FROM publish_attempts
WHERE $post_id IS NULL OR post_id = $post_id
ORDER BY post_id, platform;
