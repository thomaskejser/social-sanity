DELETE FROM channel_social_account
WHERE channel_social_account_id = $social_account_id
  AND channel_id = $owner_id;
