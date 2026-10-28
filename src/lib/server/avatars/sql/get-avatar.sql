SELECT content_type AS "contentType",
       image
FROM avatar
WHERE company_id = $company_id
   OR channel_id = $channel_id;
