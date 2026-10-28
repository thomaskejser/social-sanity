DELETE FROM company_social_account
WHERE company_social_account_id = $social_account_id
  AND company_id = $owner_id;
