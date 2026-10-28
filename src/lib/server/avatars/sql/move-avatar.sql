-- Hands a company's or channel's picture to the company or channel that replaces it.
UPDATE avatar
SET company_id = $to_company_id,
    channel_id = $to_channel_id
WHERE company_id = $company_id
   OR channel_id = $channel_id;
