DELETE FROM avatar
WHERE company_id = $company_id
   OR channel_id = $channel_id;
