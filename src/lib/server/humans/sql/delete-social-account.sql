DELETE FROM human_social_account
WHERE human_social_account_id = $social_account_id
  AND human_id = $owner_id;
