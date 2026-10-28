SELECT channel_social_account_id AS "socialAccountId",
       platform,
       channel_social_account    AS "url"
FROM channel_social_account
WHERE channel_id = $channel_id
ORDER BY platform, channel_social_account_id;
