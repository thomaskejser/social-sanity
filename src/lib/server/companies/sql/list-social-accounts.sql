SELECT company_social_account_id AS "socialAccountId",
       platform,
       company_social_account    AS "url"
FROM company_social_account
WHERE company_id = $company_id
ORDER BY platform, company_social_account_id;
