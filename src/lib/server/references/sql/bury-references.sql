-- Keeps the outside IDs of a human, company or channel that is about to be deleted.
-- external_reference_tombstone holds the name the record had.
INSERT INTO external_reference_tombstone (external_reference_tombstone_id,
                                          external_reference_tombstone, source,
                                          external_reference, deleted_at)
SELECT (SELECT COALESCE(MAX(external_reference_tombstone_id), 0) FROM external_reference_tombstone)
           + ROW_NUMBER() OVER (ORDER BY external_reference_id),
       $name, source, external_reference, $now
FROM external_reference
WHERE human_id = $human_id
   OR company_id = $company_id
   OR channel_id = $channel_id
ON CONFLICT (source, external_reference) DO NOTHING;
