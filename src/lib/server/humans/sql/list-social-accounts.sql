SELECT human_social_account_id AS "socialAccountId",
       platform,
       human_social_account    AS "url"
FROM human_social_account
WHERE human_id = $human_id
ORDER BY platform, human_social_account_id;
