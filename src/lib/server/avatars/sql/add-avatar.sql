INSERT INTO avatar (avatar_id, company_id, channel_id, content_type, image, source_url, fetched_at)
VALUES ((SELECT COALESCE(MAX(avatar_id), 0) + 1 FROM avatar), $company_id, $channel_id,
        $content_type, $image, $source_url, $now);
