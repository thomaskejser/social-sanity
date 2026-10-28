INSERT INTO human_social_account (human_social_account_id, human_id, platform, human_social_account)
VALUES ((SELECT COALESCE(MAX(human_social_account_id), 0) + 1 FROM human_social_account), $owner_id,
        $platform, $url)
ON CONFLICT DO NOTHING;
