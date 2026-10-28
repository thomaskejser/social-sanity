INSERT INTO accounts (platform, external_id, display_name, access_token_enc, refresh_token_enc,
                      expires_at, scopes, connected_at, refreshed_at)
VALUES ($platform, $external_id, $display_name, $access_token_enc, $refresh_token_enc,
        $expires_at, $scopes, $now, $now)
ON CONFLICT (platform) DO UPDATE SET
    external_id       = excluded.external_id,
    display_name      = excluded.display_name,
    access_token_enc  = excluded.access_token_enc,
    refresh_token_enc = excluded.refresh_token_enc,
    expires_at        = excluded.expires_at,
    scopes            = excluded.scopes,
    connected_at      = excluded.connected_at,
    refreshed_at      = excluded.refreshed_at;
