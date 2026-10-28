INSERT INTO company_social_account (company_social_account_id, company_id, platform,
                                    company_social_account)
VALUES ((SELECT COALESCE(MAX(company_social_account_id), 0) + 1 FROM company_social_account),
        $owner_id, $platform, $url)
ON CONFLICT DO NOTHING;
