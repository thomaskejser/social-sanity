SELECT source,
       external_reference AS "externalReference"
FROM external_reference
WHERE human_id = $human_id
   OR company_id = $company_id
   OR channel_id = $channel_id
   OR publisher_id = $publisher_id
ORDER BY source, external_reference;
