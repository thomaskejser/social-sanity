INSERT INTO content_source (content_source_id, content_source, human_id, company_id, channel_id,
                            publisher_id)
VALUES ((SELECT COALESCE(MAX(content_source_id), 0) + 1 FROM content_source), $content_source,
        $human_id, $company_id, $channel_id, $publisher_id)
ON CONFLICT DO NOTHING;
