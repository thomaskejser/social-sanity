-- A refresh that returns no new refresh token or expiry keeps the stored ones.
UPDATE accounts
SET access_token_enc  = $access_token_enc,
    refresh_token_enc = COALESCE($refresh_token_enc, refresh_token_enc),
    expires_at        = COALESCE($expires_at, expires_at),
    refreshed_at      = $refreshed_at
WHERE platform = $platform;
