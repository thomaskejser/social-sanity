SELECT human_id     AS "humanId",
       company_id   AS "companyId",
       channel_id   AS "channelId",
       publisher_id AS "publisherId"
FROM external_reference
WHERE source = $source
  AND external_reference = $external_reference;
