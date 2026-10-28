-- Hands every content source of one record to the record that replaces it.
UPDATE content_source
SET human_id   = $to_human_id,
    company_id = $to_company_id,
    channel_id = $to_channel_id
WHERE human_id = $human_id
   OR company_id = $company_id
   OR channel_id = $channel_id;
