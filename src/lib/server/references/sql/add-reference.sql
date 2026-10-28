-- An ID already linked to a record keeps that link.
INSERT INTO external_reference (external_reference_id, source, external_reference, human_id,
                                company_id, channel_id, publisher_id, created_at)
VALUES ((SELECT COALESCE(MAX(external_reference_id), 0) + 1 FROM external_reference), $source,
        $external_reference, $human_id, $company_id, $channel_id, $publisher_id, $now)
ON CONFLICT (source, external_reference) DO NOTHING;
