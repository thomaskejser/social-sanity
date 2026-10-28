INSERT INTO channel_social_account (channel_social_account_id, channel_id, platform,
                                    channel_social_account)
VALUES ((SELECT COALESCE(MAX(channel_social_account_id), 0) + 1 FROM channel_social_account),
        $owner_id, $platform, $url)
ON CONFLICT DO NOTHING;
