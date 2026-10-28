-- Adds a picture after a human's others; a picture from an address the human has is skipped.
INSERT INTO human_avatar (human_avatar_id, human_id, position, content_type, image, source_url,
                          fetched_at)
VALUES ((SELECT COALESCE(MAX(human_avatar_id), 0) + 1 FROM human_avatar), $human_id,
        (SELECT COALESCE(MAX(position) + 1, 0) FROM human_avatar WHERE human_id = $human_id),
        $content_type, $image, $source_url, $now)
ON CONFLICT DO NOTHING;
